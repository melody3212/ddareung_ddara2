"""
고도·경사도 계산 — Open-Meteo Elevation API
https://open-meteo.com/en/docs/elevation-api
"""

from __future__ import annotations

import math
from typing import Any

import httpx

OPEN_METEO_ELEVATION_URL = "https://api.open-meteo.com/v1/elevation"
MAX_POINTS_PER_REQUEST = 100
_elev_cache: dict[tuple[float, float], float] = {}


def haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6_371_000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(min(1.0, math.sqrt(a)))


def _cache_key(lat: float, lng: float) -> tuple[float, float]:
    return (round(lat, 4), round(lng, 4))


def grade_band(grade_pct: float) -> str:
    g = abs(grade_pct)
    if g < 2.0:
        return "flat"
    if g < 4.0:
        return "gentle"
    if g < 6.0:
        return "moderate"
    if g < 8.0:
        return "steep"
    return "very_steep"


def grade_color(grade_pct: float) -> str:
    g = abs(grade_pct)
    if g < 2.0:
        return "#22c55e"
    if g < 4.0:
        return "#eab308"
    if g < 6.0:
        return "#f97316"
    if g < 8.0:
        return "#ef4444"
    return "#991b1b"


async def fetch_elevations(points: list[tuple[float, float]]) -> list[float | None]:
    if not points:
        return []
    results: list[float | None] = [None] * len(points)
    to_fetch: list[tuple[int, float, float]] = []
    for i, (lat, lng) in enumerate(points):
        key = _cache_key(lat, lng)
        if key in _elev_cache:
            results[i] = _elev_cache[key]
        else:
            to_fetch.append((i, lat, lng))
    if not to_fetch:
        return results

    async with httpx.AsyncClient(timeout=25.0) as client:
        for start in range(0, len(to_fetch), MAX_POINTS_PER_REQUEST):
            chunk = to_fetch[start : start + MAX_POINTS_PER_REQUEST]
            lats = ",".join(f"{p[1]:.6f}" for p in chunk)
            lngs = ",".join(f"{p[2]:.6f}" for p in chunk)
            res = await client.get(
                OPEN_METEO_ELEVATION_URL,
                params={"latitude": lats, "longitude": lngs},
            )
            res.raise_for_status()
            data = res.json()
            elevs = data.get("elevation") or []
            for j, (idx, lat, lng) in enumerate(chunk):
                if j >= len(elevs) or elevs[j] is None:
                    continue
                elev = float(elevs[j])
                _elev_cache[_cache_key(lat, lng)] = elev
                results[idx] = elev
    return results


def resample_path(
    coordinates: list[list[float]],
    max_points: int = 40,
    min_step_m: float = 40.0,
) -> list[tuple[float, float]]:
    if not coordinates:
        return []
    pts: list[tuple[float, float]] = []
    for c in coordinates:
        if len(c) < 2:
            continue
        pts.append((float(c[1]), float(c[0])))  # lat, lng
    if len(pts) <= 1:
        return pts
    cum = [0.0]
    for i in range(1, len(pts)):
        cum.append(cum[-1] + haversine_m(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]))
    total = cum[-1]
    if total <= 0:
        return [pts[0], pts[-1]] if len(pts) > 1 else pts
    n = min(max_points, max(2, int(total / min_step_m) + 1))
    targets = [i * total / (n - 1) for i in range(n)]
    sampled: list[tuple[float, float]] = []
    j = 0
    for t in targets:
        while j < len(cum) - 1 and cum[j + 1] < t:
            j += 1
        if j >= len(cum) - 1:
            sampled.append(pts[-1])
            continue
        seg = cum[j + 1] - cum[j]
        ratio = 0.0 if seg <= 0 else (t - cum[j]) / seg
        lat = pts[j][0] + (pts[j + 1][0] - pts[j][0]) * ratio
        lng = pts[j][1] + (pts[j + 1][1] - pts[j][1]) * ratio
        sampled.append((lat, lng))
    return sampled


async def build_elevation_profile(
    coordinates: list[list[float]],
    *,
    max_points: int = 40,
) -> dict[str, Any]:
    samples = resample_path(coordinates, max_points=max_points)
    if len(samples) < 2:
        elevs = await fetch_elevations(samples) if samples else []
        elev0 = elevs[0] if elevs else None
        return {
            "source": "open-meteo",
            "points": [
                {
                    "lat": samples[0][0] if samples else None,
                    "lng": samples[0][1] if samples else None,
                    "elevation_m": elev0,
                    "distance_m": 0.0,
                }
            ]
            if samples
            else [],
            "segments": [],
            "summary": {
                "distance_m": 0.0,
                "elevation_gain_m": 0.0,
                "elevation_loss_m": 0.0,
                "max_grade_pct": 0.0,
                "avg_abs_grade_pct": 0.0,
                "steep_distance_m": 0.0,
                "steep_ratio": 0.0,
            },
        }

    elevs = await fetch_elevations(samples)
    points: list[dict[str, Any]] = []
    segments: list[dict[str, Any]] = []
    dist_acc = 0.0
    gain = 0.0
    loss = 0.0
    abs_grade_weighted = 0.0
    steep_dist = 0.0
    max_grade = 0.0

    for i, ((lat, lng), elev) in enumerate(zip(samples, elevs)):
        points.append(
            {"lat": lat, "lng": lng, "elevation_m": elev, "distance_m": round(dist_acc, 1)}
        )
        if i == 0:
            continue
        prev_lat, prev_lng = samples[i - 1]
        prev_elev = elevs[i - 1]
        horiz = haversine_m(prev_lat, prev_lng, lat, lng)
        if horiz < 1.0:
            continue
        elev_delta = 0.0
        if elev is not None and prev_elev is not None:
            elev_delta = elev - prev_elev
            if elev_delta > 0:
                gain += elev_delta
            else:
                loss += -elev_delta
        grade_pct = (
            (elev_delta / horiz) * 100.0
            if elev is not None and prev_elev is not None
            else 0.0
        )
        abs_g = abs(grade_pct)
        max_grade = max(max_grade, abs_g)
        abs_grade_weighted += abs_g * horiz
        if abs_g >= 6.0:
            steep_dist += horiz
        segments.append(
            {
                "from_idx": i - 1,
                "to_idx": i,
                "path": [[prev_lng, prev_lat], [lng, lat]],
                "distance_m": round(horiz, 1),
                "elevation_delta_m": round(elev_delta, 2),
                "grade_pct": round(grade_pct, 2),
                "abs_grade_pct": round(abs_g, 2),
                "band": grade_band(grade_pct),
                "color": grade_color(grade_pct),
                "is_steep": abs_g >= 6.0,
            }
        )
        dist_acc += horiz

    total = dist_acc or 1.0
    return {
        "source": "open-meteo",
        "points": points,
        "segments": segments,
        "summary": {
            "distance_m": round(dist_acc, 1),
            "elevation_gain_m": round(gain, 1),
            "elevation_loss_m": round(loss, 1),
            "max_grade_pct": round(max_grade, 2),
            "avg_abs_grade_pct": round(abs_grade_weighted / total, 2),
            "steep_distance_m": round(steep_dist, 1),
            "steep_ratio": round(steep_dist / total, 3),
        },
    }
