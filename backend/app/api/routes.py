"""POST /api/routes/search — 프론트 features/routes 계약"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.api.stations import MOCK_STATIONS
from app.core.config import get_settings
from app.schemas.route import RouteSearchRequest, RouteSearchResponse
from app.schemas.station import Station
from app.services.route_service import search_routes
from app.services.seoul_bike import fetch_bike_stations

router = APIRouter(prefix="/routes", tags=["routes"])


@router.post("/search", response_model=RouteSearchResponse)
async def routes_search(body: RouteSearchRequest):
    stations: list[Station] = []
    if body.mode == "ddareung":
        settings = get_settings()
        key = (settings.seoul_openapi_key or settings.bike_api_key or "").strip()
        try:
            stations, _, _ = await fetch_bike_stations(key)
        except Exception:
            stations = []
        if not stations:
            stations = MOCK_STATIONS
    try:
        routes = await search_routes(body, stations=stations)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=f"route not found: {e}") from e
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"route search failed: {e}") from e
    if not routes:
        raise HTTPException(status_code=404, detail="no route found")
    return RouteSearchResponse(routes=routes, source="osrm+elevation")


@router.get("/meta")
def routes_meta():
    return {
        "modes": {
            "personal": "내 자전거 — OSM 자전거 도로 경로",
            "ddareung": "따릉이 — 도보→대여→라이딩→반납→도보",
        },
        "preferences": ["safe", "fast", "scenic"],
        "status": "osrm",
        "note": "OSRM 실제 도로 + Open-Meteo 경사 + 턴 바이 턴 안내",
        "elevation": "POST /api/elevation/profile",
    }
