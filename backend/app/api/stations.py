"""
따릉이 대여소

데이터: 서울 열린데이터광장 — 공공자전거 실시간 대여정보 (bikeList)
https://data.seoul.go.kr/dataList/OA-15493/A/1/datasetView.do

환경변수: SEOUL_OPENAPI_KEY
미설정 시 sample 키로 소수 건 조회 시도 → 실패 시 mock
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.core.config import get_settings
from app.schemas.station import Station, StationsMeta
from app.services.seoul_bike import CACHE_TTL_SEC, fetch_bike_stations

router = APIRouter(prefix="/stations", tags=["stations"])


MOCK_STATIONS: list[Station] = [
    Station(station_id="ST-001", name="[mock] 여의도역 1번출구", lat=37.5219, lng=126.9245, bike_count=12, rack_tot_cnt=15, shared=80),
    Station(station_id="ST-002", name="[mock] 여의나루역", lat=37.5270, lng=126.9326, bike_count=5, rack_tot_cnt=20, shared=25),
    Station(station_id="ST-003", name="[mock] 서울시청", lat=37.5665, lng=126.9780, bike_count=20, rack_tot_cnt=25, shared=80),
    Station(station_id="ST-004", name="[mock] 광화문", lat=37.5759, lng=126.9768, bike_count=8, rack_tot_cnt=15, shared=53),
    Station(station_id="ST-005", name="[mock] 잠실한강공원", lat=37.5178, lng=127.0824, bike_count=15, rack_tot_cnt=20, shared=75),
]


@router.get("/meta", response_model=StationsMeta)
async def stations_meta():
    settings = get_settings()
    key = (settings.seoul_openapi_key or settings.bike_api_key or "").strip()
    configured = bool(key)
    stations, source, err = await fetch_bike_stations(key)
    if not stations:
        source = "mock"
        count = len(MOCK_STATIONS)
    else:
        count = len(stations)

    note = "서울 열린데이터 bikeList 실시간 대여소"
    if not configured:
        note += " — SEOUL_OPENAPI_KEY 미설정 (sample/mock 폴백)"
    if err and not stations:
        note += f" — API 오류: {err}"
    elif source == "seoul_sample":
        note += " — sample 키 (소량). 정식 키 발급 권장"
    elif source == "mock":
        note += " — mock 데이터"

    return StationsMeta(
        source=source,
        count=count,
        configured=configured,
        cache_ttl_sec=int(CACHE_TTL_SEC),
        note=note,
    )


@router.get("", response_model=list[Station])
async def list_stations():
    settings = get_settings()
    key = (settings.seoul_openapi_key or settings.bike_api_key or "").strip()
    stations, _source, _err = await fetch_bike_stations(key)
    if stations:
        return stations
    return MOCK_STATIONS


@router.get("/{station_id}", response_model=Station)
async def get_station(station_id: str):
    stations = await list_stations()
    for s in stations:
        if s.station_id == station_id:
            return s
    raise HTTPException(status_code=404, detail="Station not found")
