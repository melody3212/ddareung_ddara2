"""GET /api/osm-roads — 뷰포트 내 OSM 일반 도로 (경사 레이어용)"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.services.osm_roads import fetch_osm_roads

router = APIRouter(prefix="/osm-roads", tags=["osm-roads"])


class OsmRoad(BaseModel):
    path_id: str
    coordinates: list[list[float]] = Field(description="[[lng, lat], ...]")
    highway: str
    name: str | None = None


class OsmRoadsResponse(BaseModel):
    roads: list[OsmRoad]
    count: int
    source: str = "overpass"
    note: str | None = None


@router.get("", response_model=OsmRoadsResponse)
async def list_osm_roads(
    min_lat: float = Query(..., ge=30, le=45),
    min_lng: float = Query(..., ge=120, le=135),
    max_lat: float = Query(..., ge=30, le=45),
    max_lng: float = Query(..., ge=120, le=135),
    limit: int = Query(48, ge=5, le=80),
):
    if min_lat >= max_lat or min_lng >= max_lng:
        raise HTTPException(status_code=400, detail="invalid bbox")
    try:
        raw = await fetch_osm_roads(min_lat, min_lng, max_lat, max_lng, limit=limit)
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"OSM Overpass failed: {type(e).__name__}: {e}",
        ) from e

    roads = [OsmRoad(**r) for r in raw]
    return OsmRoadsResponse(
        roads=roads,
        count=len(roads),
        note="일반 도로+자전거길 OSM. 홈 경사 토글·길찾기 경로 경사와 함께 사용.",
    )
