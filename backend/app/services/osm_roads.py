"""
OSM 일반 도로 라인 (Overpass API)

경사 레이어용: 자전거 도로만이 아니라 residential/primary 등 일반 도로도 가져옴.
"""

from __future__ import annotations

import hashlib
from typing import Any

import httpx

OVERPASS_URLS = (
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
)

# 짧은 메모리 캐시 (bbox 키)
_cache: dict[str, list[dict[str, Any]]] = {}
_CACHE_MAX = 32


def _bbox_key(min_lat: float, min_lng: float, max_lat: float, max_lng: float) -> str:
    raw = f"{min_lat:.4f},{min_lng:.4f},{max_lat:.4f},{max_lng:.4f}"
    return hashlib.md5(raw.encode()).hexdigest()


async def fetch_osm_roads(
    min_lat: float,
    min_lng: float,
    max_lat: float,
    max_lng: float,
    *,
    limit: int = 50,
) -> list[dict[str, Any]]:
    """
    Returns: [{ "path_id": str, "coordinates": [[lng,lat],...], "highway": str }, ...]
    """
    # 과도한 bbox 방지
    if not (30.0 <= min_lat < max_lat <= 45.0 and 120.0 <= min_lng < max_lng <= 135.0):
        return []
    # 대략 3km 박스 초과 시 축소
    if (max_lat - min_lat) > 0.04 or (max_lng - min_lng) > 0.05:
        cy = (min_lat + max_lat) / 2
        cx = (min_lng + max_lng) / 2
        min_lat, max_lat = cy - 0.015, cy + 0.015
        min_lng, max_lng = cx - 0.018, cx + 0.018

    key = _bbox_key(min_lat, min_lng, max_lat, max_lng)
    if key in _cache:
        return _cache[key][:limit]

    # highway 필터: 자전거가 갈 수 있는 일반 도로 + 자전거길
    query = f"""
[out:json][timeout:18];
(
  way["highway"~"^(primary|secondary|tertiary|unclassified|residential|living_street|service|cycleway|path|footway|pedestrian|track)$"]
    ({min_lat},{min_lng},{max_lat},{max_lng});
);
out geom {limit};
"""
    data: dict[str, Any] | None = None
    last_err: str | None = None
    async with httpx.AsyncClient(timeout=25.0, follow_redirects=True) as client:
        for url in OVERPASS_URLS:
            try:
                # GET form often more reliable behind some networks
                res = await client.post(
                    url,
                    data={"data": query},
                    headers={"Accept": "application/json"},
                )
                if res.status_code != 200:
                    last_err = f"{url} HTTP {res.status_code} {res.text[:120]}"
                    continue
                data = res.json()
                if "elements" not in data:
                    last_err = f"{url} no elements key"
                    data = None
                    continue
                break
            except Exception as e:
                last_err = f"{url} {type(e).__name__}: {e}"
                continue

    if not data:
        raise RuntimeError(last_err or "overpass failed")

    roads: list[dict[str, Any]] = []
    for el in data.get("elements") or []:
        if el.get("type") != "way":
            continue
        geom = el.get("geometry") or []
        if len(geom) < 2:
            continue
        coords: list[list[float]] = []
        for g in geom:
            try:
                lat = float(g["lat"])
                lng = float(g["lon"])
            except (KeyError, TypeError, ValueError):
                continue
            coords.append([lng, lat])
        if len(coords) < 2:
            continue
        # 너무 긴 way 는 중간 샘플
        if len(coords) > 40:
            step = max(1, len(coords) // 30)
            coords = coords[::step]
            if coords[-1] != [geom[-1]["lon"], geom[-1]["lat"]]:
                coords.append([float(geom[-1]["lon"]), float(geom[-1]["lat"])])

        tags = el.get("tags") or {}
        highway = str(tags.get("highway") or "road")
        wid = el.get("id")
        roads.append(
            {
                "path_id": f"osm-{wid}",
                "coordinates": coords,
                "highway": highway,
                "name": tags.get("name"),
            }
        )
        if len(roads) >= limit:
            break

    if len(_cache) >= _CACHE_MAX:
        _cache.pop(next(iter(_cache)))
    _cache[key] = roads
    return roads
