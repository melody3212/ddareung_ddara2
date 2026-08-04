"""길찾기 — OSRM 도로 + 경사 + 턴 안내."""

from __future__ import annotations

import math
import uuid
from typing import Any

from app.schemas.route import LatLng, NavStep, RouteLeg, RouteSearchRequest, RouteSearchResult
from app.schemas.station import Station
from app.services.elevation_service import build_elevation_profile, haversine_m
from app.services.road_router import RoadRoute, route_along_roads, route_bike, route_foot


def _to_nav_steps(raw: list[dict[str, Any]], *, offset_m: float = 0.0) -> list[NavStep]:
    steps: list[NavStep] = []
    for s in raw:
        steps.append(
            NavStep(
                instruction=str(s.get("instruction") or "진행"),
                maneuver_type=str(s.get("maneuver_type") or ""),
                modifier=s.get("modifier"),
                road_name=s.get("road_name"),
                distance_m=float(s.get("distance_m") or 0),
                duration_s=float(s.get("duration_s") or 0),
                lat=float(s["lat"]),
                lng=float(s["lng"]),
                distance_along_m=round(float(s.get("distance_along_m") or 0) + offset_m, 1),
                leg_kind=s.get("leg_kind") or "bike",
                icon=str(s.get("icon") or "straight"),
            )
        )
    return steps


def _duration_min(road: RoadRoute | None, distance_m: float, kind: str) -> int:
    if road and road.duration_s > 0:
        return max(1, int(math.ceil(road.duration_s / 60)))
    speed = 15_000 / 3600 if kind == "bike" else 4_500 / 3600
    return max(1, int(math.ceil(distance_m / speed / 60)))


def _nearest(
    point: LatLng,
    stations: list[Station],
    *,
    need_bikes: bool | None = None,
    need_racks: bool | None = None,
    limit: int = 3,
) -> list[Station]:
    scored: list[tuple[float, Station]] = []
    for s in stations:
        if need_bikes is True and (s.bike_count is None or s.bike_count <= 0):
            continue
        if need_racks is True and s.rack_tot_cnt is not None and s.bike_count is not None:
            if s.rack_tot_cnt - s.bike_count <= 0:
                continue
        scored.append((haversine_m(point.lat, point.lng, s.lat, s.lng), s))
    scored.sort(key=lambda x: x[0])
    return [s for _, s in scored[:limit]]


def _merge_paths(*paths: list[list[float]]) -> list[list[float]]:
    full: list[list[float]] = []
    for p in paths:
        if not p:
            continue
        if not full:
            full.extend(p)
        else:
            full.extend(p[1:] if len(p) > 1 else p)
    return full


async def search_routes(
    body: RouteSearchRequest,
    stations: list[Station] | None = None,
) -> list[RouteSearchResult]:
    stations = stations or []

    if body.mode == "personal":
        if body.via and len(body.via) >= 2:
            pts = [(float(c[0]), float(c[1])) for c in body.via if len(c) >= 2]
            if len(pts) < 2:
                pts = [
                    (body.origin.lng, body.origin.lat),
                    (body.destination.lng, body.destination.lat),
                ]
            road = await route_along_roads(pts, profile="bike")
        else:
            road = await route_bike(
                body.origin.lng,
                body.origin.lat,
                body.destination.lng,
                body.destination.lat,
            )
        path = road.path
        elev = await build_elevation_profile(path, max_points=48)
        dist = road.distance_m or elev["summary"]["distance_m"]
        duration = _duration_min(road, dist, "bike")
        nav = _to_nav_steps(road.steps)
        return [
            RouteSearchResult(
                route_id=str(uuid.uuid4())[:8],
                mode="personal",
                preference=body.preference,
                distance_m=round(dist, 1),
                duration_min=duration,
                path=path,
                elevation=elev["summary"],
                segments=elev["segments"],
                legs=[
                    RouteLeg(
                        kind="bike",
                        from_label="출발",
                        to_label="도착",
                        path=path,
                        distance_m=round(dist, 1),
                        duration_min=duration,
                        grade_summary=elev["summary"],
                        steps=nav,
                    )
                ],
                steps=nav,
                walk_distance_m=0.0,
                bike_distance_m=round(dist, 1),
                walk_duration_min=0,
                bike_duration_min=duration,
                notes=[
                    f"실제 도로 경로 ({road.provider})",
                    f"길안내 단계 {len(nav)}개",
                ],
                is_stub=False,
            )
        ]

    notes: list[str] = []
    rent_c = _nearest(body.origin, stations, need_bikes=True, limit=3) or _nearest(
        body.origin, stations, limit=1
    )
    ret_c = _nearest(body.destination, stations, need_racks=True, limit=3) or _nearest(
        body.destination, stations, limit=1
    )
    if not rent_c or not ret_c:
        road = await route_bike(
            body.origin.lng,
            body.origin.lat,
            body.destination.lng,
            body.destination.lat,
        )
        elev = await build_elevation_profile(road.path, max_points=48)
        dist = road.distance_m or elev["summary"]["distance_m"]
        return [
            RouteSearchResult(
                route_id=str(uuid.uuid4())[:8],
                mode="ddareung",
                preference=body.preference,
                distance_m=round(dist, 1),
                duration_min=_duration_min(road, dist, "bike"),
                path=road.path,
                elevation=elev["summary"],
                segments=elev["segments"],
                legs=[],
                steps=_to_nav_steps(road.steps),
                notes=notes + ["대여소 데이터 없음 → 단일 경로"],
                is_stub=False,
            )
        ]

    results: list[RouteSearchResult] = []
    combos = [(r, t) for r in rent_c[:2] for t in ret_c[:2]][:3]
    for rent, ret in combos:
        try:
            w1 = await route_foot(body.origin.lng, body.origin.lat, rent.lng, rent.lat)
            bk = await route_bike(rent.lng, rent.lat, ret.lng, ret.lat)
            w2 = await route_foot(ret.lng, ret.lat, body.destination.lng, body.destination.lat)
        except ValueError:
            continue
        full = _merge_paths(w1.path, bk.path, w2.path)
        elev = await build_elevation_profile(full, max_points=48)
        bike_elev = await build_elevation_profile(bk.path, max_points=36)
        walk_d = w1.distance_m + w2.distance_m
        bike_d = bk.distance_m
        w1m = _duration_min(w1, w1.distance_m, "walk")
        bkm = _duration_min(bk, bike_d, "bike")
        w2m = _duration_min(w2, w2.distance_m, "walk")
        s1 = _to_nav_steps(w1.steps, offset_m=0)
        s2 = _to_nav_steps(bk.steps, offset_m=w1.distance_m)
        s3 = _to_nav_steps(w2.steps, offset_m=w1.distance_m + bk.distance_m)
        all_s = s1 + s2 + s3
        results.append(
            RouteSearchResult(
                route_id=str(uuid.uuid4())[:8],
                mode="ddareung",
                preference=body.preference,
                distance_m=round(walk_d + bike_d, 1),
                duration_min=w1m + bkm + w2m,
                path=full,
                elevation=elev["summary"],
                segments=elev["segments"],
                legs=[
                    RouteLeg(
                        kind="walk",
                        from_label="출발",
                        to_label=f"대여소 · {rent.name}",
                        path=w1.path,
                        distance_m=round(w1.distance_m, 1),
                        duration_min=w1m,
                        steps=s1,
                    ),
                    RouteLeg(
                        kind="bike",
                        from_label=f"대여 · {rent.name}",
                        to_label=f"반납 · {ret.name}",
                        path=bk.path,
                        distance_m=round(bike_d, 1),
                        duration_min=bkm,
                        grade_summary=bike_elev["summary"],
                        steps=s2,
                    ),
                    RouteLeg(
                        kind="walk",
                        from_label=f"반납소 · {ret.name}",
                        to_label="도착",
                        path=w2.path,
                        distance_m=round(w2.distance_m, 1),
                        duration_min=w2m,
                        steps=s3,
                    ),
                ],
                steps=all_s,
                walk_distance_m=round(walk_d, 1),
                bike_distance_m=round(bike_d, 1),
                walk_duration_min=w1m + w2m,
                bike_duration_min=bkm,
                notes=[
                    f"도보(대여소) {walk_d:.0f}m · 약 {w1m + w2m}분",
                    f"라이딩 {bike_d / 1000:.2f}km · {bkm}분",
                    f"길안내 {len(all_s)}단계",
                ],
                is_stub=False,
            )
        )

    if not results:
        raise ValueError("could not build road routes")
    if body.preference == "fast":
        results.sort(key=lambda r: (r.distance_m, r.elevation.max_grade_pct))
    else:
        results.sort(key=lambda r: (r.elevation.max_grade_pct, r.distance_m))
    return results
