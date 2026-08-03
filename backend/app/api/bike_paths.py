"""
자전거길 레이어

데이터 출처: 생활안전지도(safemap.go.kr) OpenAPI — 자전거길 (objtId=219)
- 상세: https://www.safemap.go.kr/opna/data/dataViewRenew.do?objtId=219
- WMS:  http(s)://www.safemap.go.kr/openapi2/IF_0101_WMS  (레이어 A2SM_BIKE)
- REST 좌표(IF_0101): 공식 문서상 「데이터 제공 준비중」 → 벡터 GeoJSON 불가, WMS 사용

카카오맵은 WMS를 직접 지원하지 않으므로 백엔드가 이미지를 프록시하고,
프론트는 GroundOverlay 로 현재 뷰포트에 덮는다.
"""

from __future__ import annotations

from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.core.config import get_settings

router = APIRouter(prefix="/bike-paths", tags=["bike-paths"])

# 공식 샘플 기준 엔드포인트 (HTTPS 우선, 실패 시 서비스가 HTTP만 허용할 수 있음)
SAFEMAP_WMS_URLS = (
    "https://www.safemap.go.kr/openapi2/IF_0101_WMS",
    "http://www.safemap.go.kr/openapi2/IF_0101_WMS",
    "https://safemap.go.kr/openapi2/IF_0101_WMS",
    "http://safemap.go.kr/openapi2/IF_0101_WMS",
)


class BikePath(BaseModel):
    path_id: int
    name: str | None = None
    grade: str | None = None
    coordinates: list[list[float]] = Field(description="[lng, lat][]")
    is_disconnected: bool = False


class BikePathMeta(BaseModel):
    source: str  # safemap_wms | mock
    configured: bool
    layer: str | None = None
    note: str
    docs_url: str = "https://www.safemap.go.kr/opna/data/dataViewRenew.do?objtId=219"


# 키 없을 때 / WMS 실패 시 쓰는 짧은 mock (한강 일부) — 실제 전국 도로 아님
MOCK_PATHS: list[BikePath] = [
    BikePath(
        path_id=1,
        name="[mock] 한강 자전거길 샘플 (여의도~이촌 방향)",
        grade="easy",
        coordinates=[
            [126.9245, 37.5219],
            [126.9400, 37.5210],
            [126.9550, 37.5200],
            [126.9700, 37.5185],
            [126.9850, 37.5175],
            [126.9950, 37.5170],
        ],
    ),
]


@router.get("/meta", response_model=BikePathMeta)
def bike_paths_meta():
    settings = get_settings()
    has_key = bool(settings.safemap_service_key and settings.safemap_service_key.strip())
    if has_key:
        return BikePathMeta(
            source="safemap_wms",
            configured=True,
            layer="A2SM_BIKE",
            note="생활안전지도 WMS(IF_0101_WMS). REST 좌표 API는 제공 준비중이라 이미지 레이어로 표시합니다.",
        )
    return BikePathMeta(
        source="mock",
        configured=False,
        layer=None,
        note="SAFEMAP_SERVICE_KEY 가 없습니다. 생활안전지도에서 인증키 발급 후 backend/.env 에 넣으세요. 현재는 mock 폴리라인만 표시됩니다.",
    )


@router.get("", response_model=list[BikePath])
def list_bike_paths():
    """벡터 목록. Safemap REST는 준비중이므로 mock 반환(폴백용)."""
    return MOCK_PATHS


@router.get("/wms")
async def bike_paths_wms(
    minx: float = Query(..., description="bbox 서쪽 경도 (WGS84)"),
    miny: float = Query(..., description="bbox 남쪽 위도"),
    maxx: float = Query(..., description="bbox 동쪽 경도"),
    maxy: float = Query(..., description="bbox 북쪽 위도"),
    width: int = Query(512, ge=64, le=2048),
    height: int = Query(512, ge=64, le=2048),
):
    """
    생활안전지도 자전거길 WMS 프록시 (PNG).
    키는 서버에만 두고 브라우저 CORS/키 노출을 막는다.
    """
    settings = get_settings()
    key = (settings.safemap_service_key or "").strip()
    if not key:
        raise HTTPException(
            status_code=503,
            detail="SAFEMAP_SERVICE_KEY not configured. Issue a key at safemap.go.kr OpenAPI.",
        )

    # 과도한 bbox 방지 (대략 한국 부근)
    if not (120.0 <= minx < maxx <= 135.0 and 30.0 <= miny < maxy <= 45.0):
        raise HTTPException(status_code=400, detail="bbox out of expected range")

    bbox = f"{minx},{miny},{maxx},{maxy}"
    params = {
        "serviceKey": key,
        "srs": "EPSG:4326",
        "bbox": bbox,
        "format": "image/png",
        "width": str(width),
        "height": str(height),
        "transparent": "TRUE",
    }
    query = urlencode(params)

    last_err: str | None = None
    async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
        for base in SAFEMAP_WMS_URLS:
            url = f"{base}?{query}"
            try:
                res = await client.get(url)
            except httpx.HTTPError as e:
                last_err = str(e)
                continue

            content_type = (res.headers.get("content-type") or "").lower()
            if res.status_code == 200 and (
                "image" in content_type or res.content[:8] == b"\x89PNG\r\n\x1a\n"
            ):
                return Response(
                    content=res.content,
                    media_type="image/png",
                    headers={"Cache-Control": "public, max-age=120"},
                )

            # 일부 응답이 XML 에러일 수 있음
            snippet = res.text[:300] if res.text else ""
            last_err = f"{base} → HTTP {res.status_code} {content_type} {snippet}"

    raise HTTPException(
        status_code=502,
        detail=f"Safemap WMS fetch failed: {last_err}",
    )
