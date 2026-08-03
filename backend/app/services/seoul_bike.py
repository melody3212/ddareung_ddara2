"""
서울 열린데이터광장 — 따릉이 실시간 대여정보 (bikeList)

문서: https://data.seoul.go.kr/dataList/OA-15493/A/1/datasetView.do
URL:  http://openapi.seoul.go.kr:8088/{KEY}/json/bikeList/{start}/{end}/
한 번에 최대 1000건 → 1/1000, 1001/2000 … 분할 호출
"""

from __future__ import annotations

import time
from typing import Any

import httpx

from app.schemas.station import Station

SEOUL_BIKE_BASE = "http://openapi.seoul.go.kr:8088"
PAGE_SIZE = 1000
# 안전 상한 (대여소 ~3천대 수준 대비)
MAX_END = 5000

_cache: dict[str, Any] = {
    "ts": 0.0,
    "key": None,
    "stations": [],
    "source": "empty",
    "error": None,
}
CACHE_TTL_SEC = 90.0


def _parse_row(row: dict[str, Any]) -> Station | None:
    try:
        lat = float(row.get("stationLatitude") or 0)
        lng = float(row.get("stationLongitude") or 0)
    except (TypeError, ValueError):
        return None
    if lat == 0 or lng == 0:
        return None

    bike_raw = row.get("parkingBikeTotCnt")
    rack_raw = row.get("rackTotCnt")
    shared_raw = row.get("shared")
    try:
        bike_count = int(float(bike_raw)) if bike_raw is not None else None
    except (TypeError, ValueError):
        bike_count = None
    try:
        rack_tot_cnt = int(float(rack_raw)) if rack_raw is not None else None
    except (TypeError, ValueError):
        rack_tot_cnt = None
    try:
        shared = float(shared_raw) if shared_raw is not None else None
    except (TypeError, ValueError):
        shared = None

    return Station(
        station_id=str(row.get("stationId") or ""),
        name=str(row.get("stationName") or "").strip() or "이름 없음",
        lat=lat,
        lng=lng,
        bike_count=bike_count,
        rack_tot_cnt=rack_tot_cnt,
        shared=shared,
    )


async def _fetch_page(client: httpx.AsyncClient, key: str, start: int, end: int) -> tuple[list[dict], str | None]:
    url = f"{SEOUL_BIKE_BASE}/{key}/json/bikeList/{start}/{end}/"
    res = await client.get(url)
    res.raise_for_status()
    text = res.text.strip()
    if not text:
        return [], "empty response body"
    try:
        data = res.json()
    except ValueError:
        return [], f"non-json response: {text[:200]}"

    # 정상: rentBikeStatus / 오류 시 RESULT 만 오는 경우도 있음
    status = data.get("rentBikeStatus")
    if not status:
        # {"RESULT":{"CODE":"INFO-200",...}} 형태
        result = data.get("RESULT") or {}
        code = result.get("CODE", "UNKNOWN")
        msg = result.get("MESSAGE", "unknown error")
        return [], f"{code}: {msg}"

    result = status.get("RESULT") or {}
    code = result.get("CODE", "")
    if code and code != "INFO-000":
        return [], f"{code}: {result.get('MESSAGE', '')}"

    rows = status.get("row") or []
    if isinstance(rows, dict):
        rows = [rows]
    return list(rows), None


async def fetch_bike_stations(api_key: str) -> tuple[list[Station], str, str | None]:
    """
    Returns (stations, source, error_message)
    source: seoul_bikeList | seoul_sample | empty
    """
    key = (api_key or "").strip() or "sample"
    source = "seoul_sample" if key == "sample" else "seoul_bikeList"

    now = time.time()
    if (
        _cache["key"] == key
        and _cache["stations"]
        and now - float(_cache["ts"]) < CACHE_TTL_SEC
    ):
        return list(_cache["stations"]), str(_cache["source"]), _cache.get("error")

    stations: list[Station] = []
    err: str | None = None

    async with httpx.AsyncClient(timeout=25.0) as client:
        # sample 키는 1~5 구간만 허용 (ERROR-335)
        if key == "sample":
            ranges = [(1, 5)]
        else:
            ranges = []
            start = 1
            while start <= MAX_END:
                end = start + PAGE_SIZE - 1
                ranges.append((start, end))
                start = end + 1

        for start, end in ranges:
            try:
                rows, page_err = await _fetch_page(client, key, start, end)
            except httpx.HTTPError as e:
                err = f"HTTP error: {e}"
                break

            if page_err:
                if stations:
                    break
                err = page_err
                break

            if not rows:
                break

            for row in rows:
                st = _parse_row(row)
                if st and st.station_id:
                    stations.append(st)

            if key == "sample" or len(rows) < PAGE_SIZE:
                break

    _cache["ts"] = now
    _cache["key"] = key
    _cache["stations"] = stations
    _cache["source"] = source if stations else "empty"
    _cache["error"] = err
    return stations, str(_cache["source"]), err
