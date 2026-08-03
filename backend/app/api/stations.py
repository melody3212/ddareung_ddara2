from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/stations", tags=["stations"])


class Station(BaseModel):
    station_id: str
    name: str
    lat: float
    lng: float
    bike_count: int | None = None


# MVP mock — replace with Seoul Open API + cache
MOCK_STATIONS: list[Station] = [
    Station(station_id="ST-001", name="여의도역 1번출구", lat=37.5219, lng=126.9245, bike_count=12),
    Station(station_id="ST-002", name="여의나루역", lat=37.5270, lng=126.9326, bike_count=5),
    Station(station_id="ST-003", name="서울시청", lat=37.5665, lng=126.9780, bike_count=20),
    Station(station_id="ST-004", name="광화문", lat=37.5759, lng=126.9768, bike_count=8),
    Station(station_id="ST-005", name="잠실한강공원", lat=37.5178, lng=127.0824, bike_count=15),
]


@router.get("", response_model=list[Station])
def list_stations():
    return MOCK_STATIONS


@router.get("/{station_id}", response_model=Station)
def get_station(station_id: str):
    for s in MOCK_STATIONS:
        if s.station_id == station_id:
            return s
    from fastapi import HTTPException

    raise HTTPException(status_code=404, detail="Station not found")
