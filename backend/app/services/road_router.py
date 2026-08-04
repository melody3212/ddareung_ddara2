"""OSRM 실제 도로 경로 (bike/foot) + steps."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

import httpx

from app.services.nav_instructions import parse_osrm_steps

Profile = Literal["bike", "foot"]

FOSSGIS = {
    "bike": "https://routing.openstreetmap.de/routed-bike/route/v1/bike",
    "foot": "https://routing.openstreetmap.de/routed-foot/route/v1/foot",
}
PROJECT_OSRM = {
    "bike": "https://router.project-osrm.org/route/v1/bike",
    "foot": "https://router.project-osrm.org/route/v1/foot",
}


@dataclass
class RoadRoute:
    path: list[list[float]]
    distance_m: float
    duration_s: float
    provider: str
    profile: str
    steps: list[dict[str, Any]] = field(default_factory=list)


def _coords_param(points: list[tuple[float, float]]) -> str:
    return ";".join(f"{lng:.6f},{lat:.6f}" for lng, lat in points)


async def _fetch_osrm(
    base: str,
    points: list[tuple[float, float]],
    provider: str,
    *,
    leg_kind: str,
) -> RoadRoute | None:
    if len(points) < 2:
        return None
    url = f"{base}/{_coords_param(points)}"
    params = {"overview": "full", "geometries": "geojson", "steps": "true"}
    try:
        async with httpx.AsyncClient(timeout=25.0, follow_redirects=True) as client:
            res = await client.get(url, params=params)
            if res.status_code != 200:
                return None
            data = res.json()
    except httpx.HTTPError:
        return None
    if data.get("code") not in (None, "Ok", "ok") and data.get("code") != "Ok":
        return None
    routes = data.get("routes") or []
    if not routes:
        return None
    route = routes[0]
    coords = (route.get("geometry") or {}).get("coordinates") or []
    if len(coords) < 2:
        return None
    path = [[float(c[0]), float(c[1])] for c in coords if len(c) >= 2]
    if len(path) < 2:
        return None
    return RoadRoute(
        path=path,
        distance_m=float(route.get("distance") or 0),
        duration_s=float(route.get("duration") or 0),
        provider=provider,
        profile=leg_kind,
        steps=parse_osrm_steps(route, leg_kind=leg_kind),
    )


async def route_along_roads(
    points: list[tuple[float, float]],
    *,
    profile: Profile = "bike",
) -> RoadRoute:
    if len(points) < 2:
        raise ValueError("need at least 2 points")
    leg_kind = "walk" if profile == "foot" else "bike"
    bases = [
        (FOSSGIS[profile], f"fossgis-{profile}"),
        (PROJECT_OSRM[profile], f"osrm-{profile}"),
    ]
    if profile == "bike":
        bases.append(
            ("https://router.project-osrm.org/route/v1/driving", "osrm-driving-fallback")
        )
    last = None
    for base, name in bases:
        result = await _fetch_osrm(base, points, name, leg_kind=leg_kind)
        if result:
            return result
        last = name
    raise ValueError(f"road routing failed after {last}")


async def route_bike(o_lng: float, o_lat: float, d_lng: float, d_lat: float) -> RoadRoute:
    return await route_along_roads([(o_lng, o_lat), (d_lng, d_lat)], profile="bike")


async def route_foot(o_lng: float, o_lat: float, d_lng: float, d_lat: float) -> RoadRoute:
    return await route_along_roads([(o_lng, o_lat), (d_lng, d_lat)], profile="foot")
