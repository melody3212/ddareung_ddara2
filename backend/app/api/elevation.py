"""고도·경사도 API — 프론트 features/elevation 계약"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.schemas.elevation import (
    BatchProfileRequest,
    BatchProfileResponse,
    ElevationMeta,
    ElevationProfile,
    ProfileRequest,
)
from app.services.elevation_service import build_elevation_profile

router = APIRouter(prefix="/elevation", tags=["elevation"])
MAX_COORDS = 200


def _validate(coordinates: list[list[float]]) -> list[list[float]]:
    cleaned: list[list[float]] = []
    for c in coordinates[:MAX_COORDS]:
        if len(c) < 2:
            continue
        lng, lat = float(c[0]), float(c[1])
        if not (120.0 <= lng <= 135.0 and 30.0 <= lat <= 45.0):
            raise HTTPException(status_code=400, detail="coordinates out of expected Korea range")
        cleaned.append([lng, lat])
    if len(cleaned) < 2:
        raise HTTPException(status_code=400, detail="need at least 2 valid coordinates")
    return cleaned


@router.post("/profile", response_model=ElevationProfile)
async def elevation_profile(body: ProfileRequest):
    coords = _validate(body.coordinates)
    try:
        data = await build_elevation_profile(coords, max_points=body.max_points)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"elevation fetch failed: {e}") from e
    return ElevationProfile(**data)


@router.post("/batch", response_model=BatchProfileResponse)
async def elevation_batch(body: BatchProfileRequest):
    profiles: list[ElevationProfile] = []
    try:
        for p in body.paths:
            coords = _validate(p.coordinates)
            data = await build_elevation_profile(coords, max_points=body.max_points)
            profiles.append(ElevationProfile(**data, path_id=p.path_id))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"elevation batch failed: {e}") from e
    return BatchProfileResponse(profiles=profiles)


@router.get("/meta", response_model=ElevationMeta)
def elevation_meta():
    return ElevationMeta(
        source="open-meteo",
        bands={
            "flat": "< 2%",
            "gentle": "2–4%",
            "moderate": "4–6%",
            "steep": "6–8%",
            "very_steep": "≥ 8%",
        },
        colors={
            "flat": "#22c55e",
            "gentle": "#eab308",
            "moderate": "#f97316",
            "steep": "#ef4444",
            "very_steep": "#991b1b",
        },
        steep_threshold_pct=6.0,
        note="카카오 경사 API 미제공 → DEM 기반 자체 계산.",
        configured=True,
    )
