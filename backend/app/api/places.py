"""
장소 검색 API — 카카오 로컬 (KAKAO_REST_KEY) + mock 폴백
"""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.core.config import get_settings
from app.schemas.place import PlaceMeta, PlaceSearchResponse
from app.services.kakao_place import search_places

router = APIRouter(prefix="/places", tags=["places"])


@router.get("/meta", response_model=PlaceMeta)
def places_meta():
    settings = get_settings()
    key = (settings.kakao_rest_key or "").strip()
    configured = bool(key)
    if configured:
        return PlaceMeta(
            source="kakao",
            configured=True,
            note="카카오 로컬 키워드 검색. 실패 시 mock 폴백.",
        )
    return PlaceMeta(
        source="mock",
        configured=False,
        note="KAKAO_REST_KEY 미설정 — mock 장소만 제공. backend/.env 에 REST 키 설정.",
    )


@router.get("/search", response_model=PlaceSearchResponse)
async def places_search(
    q: str = Query(..., min_length=1, description="검색어"),
    lat: float | None = Query(default=None, description="기준 위도 (거리 정렬)"),
    lng: float | None = Query(default=None, description="기준 경도"),
    size: int = Query(default=10, ge=1, le=15),
    radius: int | None = Query(default=None, ge=0, le=20000, description="반경 m (카카오)"),
):
    items, source, note = await search_places(
        q,
        lat=lat,
        lng=lng,
        size=size,
        radius=radius,
    )
    return PlaceSearchResponse(
        query=q,
        items=items,
        count=len(items),
        source=source,
        note=note,
    )
