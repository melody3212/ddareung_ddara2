"""
카카오 로컬 키워드 검색 프록시

문서: https://developers.kakao.com/docs/latest/ko/local/dev-guide#search-by-keyword
환경변수: KAKAO_REST_KEY
미설정·실패 시 MOCK_PLACES 폴백
"""

from __future__ import annotations

from typing import Any

import httpx

from app.core.config import get_settings
from app.schemas.place import PlaceItem
from app.services.elevation_service import haversine_m

KAKAO_KEYWORD_URL = "https://dapi.kakao.com/v2/local/search/keyword.json"

MOCK_PLACES: list[dict[str, Any]] = [
    {
        "id": "mock-1",
        "name": "여의도한강공원",
        "address": "서울 영등포구 여의도동",
        "road_address": "서울 영등포구 여의동로 330",
        "lat": 37.5285,
        "lng": 126.9329,
        "category": "여행 > 공원",
        "phone": "",
        "place_url": "https://place.map.kakao.com/",
    },
    {
        "id": "mock-2",
        "name": "서울시청",
        "address": "서울 중구 태평로1가 31",
        "road_address": "서울 중구 세종대로 110",
        "lat": 37.5665,
        "lng": 126.9780,
        "category": "공공기관 > 시청",
        "phone": "02-120",
        "place_url": "https://place.map.kakao.com/",
    },
    {
        "id": "mock-3",
        "name": "광화문광장",
        "address": "서울 종로구 세종로",
        "road_address": "서울 종로구 세종대로 172",
        "lat": 37.5720,
        "lng": 126.9769,
        "category": "여행 > 관광명소",
        "phone": "",
        "place_url": "https://place.map.kakao.com/",
    },
    {
        "id": "mock-4",
        "name": "잠실한강공원",
        "address": "서울 송파구 잠실동",
        "road_address": "서울 송파구 한가람로 65",
        "lat": 37.5178,
        "lng": 127.0824,
        "category": "여행 > 공원",
        "phone": "",
        "place_url": "https://place.map.kakao.com/",
    },
    {
        "id": "mock-5",
        "name": "반포한강공원",
        "address": "서울 서초구 반포동",
        "road_address": "서울 서초구 신반포로11길 40",
        "lat": 37.5105,
        "lng": 126.9959,
        "category": "여행 > 공원",
        "phone": "",
        "place_url": "https://place.map.kakao.com/",
    },
    {
        "id": "mock-6",
        "name": "남산서울타워",
        "address": "서울 용산구 용산동2가",
        "road_address": "서울 용산구 남산공원길 105",
        "lat": 37.5512,
        "lng": 126.9882,
        "category": "여행 > 관광명소",
        "phone": "02-3455-9277",
        "place_url": "https://place.map.kakao.com/",
    },
    {
        "id": "mock-7",
        "name": "경복궁",
        "address": "서울 종로구 세종로",
        "road_address": "서울 종로구 사직로 161",
        "lat": 37.5796,
        "lng": 126.9770,
        "category": "여행 > 관광명소",
        "phone": "02-3700-3900",
        "place_url": "https://place.map.kakao.com/",
    },
    {
        "id": "mock-8",
        "name": "여의도역",
        "address": "서울 영등포구 여의도동",
        "road_address": "서울 영등포구 여의나루로 40",
        "lat": 37.5219,
        "lng": 126.9245,
        "category": "교통,수송 > 지하철역",
        "phone": "",
        "place_url": "https://place.map.kakao.com/",
    },
]


def filter_mock_places(
    query: str,
    *,
    lat: float | None = None,
    lng: float | None = None,
    size: int = 10,
) -> list[PlaceItem]:
    q = (query or "").strip().lower()
    items: list[PlaceItem] = []
    for raw in MOCK_PLACES:
        name = str(raw.get("name") or "")
        addr = str(raw.get("address") or "")
        cat = str(raw.get("category") or "")
        if q and q not in name.lower() and q not in addr.lower() and q not in cat.lower():
            # 부분 토큰 매칭
            tokens = [t for t in q.replace(",", " ").split() if t]
            hay = f"{name} {addr} {cat}".lower()
            if tokens and not any(t in hay for t in tokens):
                continue
        plat = float(raw["lat"])
        plng = float(raw["lng"])
        dist = None
        if lat is not None and lng is not None:
            dist = round(haversine_m(lat, lng, plat, plng), 1)
        items.append(
            PlaceItem(
                id=str(raw["id"]),
                name=name,
                address=raw.get("address"),
                road_address=raw.get("road_address"),
                lat=plat,
                lng=plng,
                category=raw.get("category"),
                phone=raw.get("phone") or None,
                distance_m=dist,
                place_url=raw.get("place_url"),
            )
        )
    if lat is not None and lng is not None:
        items.sort(key=lambda x: x.distance_m if x.distance_m is not None else 1e18)
    return items[: max(1, min(size, 15))]


def _parse_kakao_doc(doc: dict[str, Any], origin: tuple[float, float] | None) -> PlaceItem | None:
    try:
        y = float(doc.get("y") or 0)
        x = float(doc.get("x") or 0)
    except (TypeError, ValueError):
        return None
    if y == 0 and x == 0:
        return None
    dist = None
    if origin is not None:
        dist = round(haversine_m(origin[0], origin[1], y, x), 1)
    # Kakao distance 필드(미터 문자열) 우선
    if doc.get("distance") not in (None, ""):
        try:
            dist = float(doc["distance"])
        except (TypeError, ValueError):
            pass
    return PlaceItem(
        id=str(doc.get("id") or f"{y},{x}"),
        name=str(doc.get("place_name") or ""),
        address=doc.get("address_name"),
        road_address=doc.get("road_address_name"),
        lat=y,
        lng=x,
        category=doc.get("category_name"),
        phone=doc.get("phone") or None,
        distance_m=dist,
        place_url=doc.get("place_url"),
    )


async def search_places(
    query: str,
    *,
    lat: float | None = None,
    lng: float | None = None,
    size: int = 10,
    radius: int | None = None,
) -> tuple[list[PlaceItem], str, str | None]:
    """
    Returns: (items, source, note)
    """
    q = (query or "").strip()
    if not q:
        return [], "empty", "query 가 비어 있습니다"

    settings = get_settings()
    key = (settings.kakao_rest_key or "").strip()
    size = max(1, min(int(size), 15))

    if not key:
        items = filter_mock_places(q, lat=lat, lng=lng, size=size)
        return items, "mock", "KAKAO_REST_KEY 미설정 — mock 장소"

    headers = {"Authorization": f"KakaoAK {key}"}
    params: dict[str, Any] = {
        "query": q,
        "size": size,
        "page": 1,
        "sort": "accuracy" if lat is None else "distance",
    }
    if lat is not None and lng is not None:
        params["y"] = lat
        params["x"] = lng
        if radius is not None:
            params["radius"] = max(0, min(int(radius), 20000))

    origin = (lat, lng) if lat is not None and lng is not None else None
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            res = await client.get(KAKAO_KEYWORD_URL, headers=headers, params=params)
            res.raise_for_status()
            data = res.json()
        docs = data.get("documents") or []
        items: list[PlaceItem] = []
        for doc in docs:
            if not isinstance(doc, dict):
                continue
            item = _parse_kakao_doc(doc, origin)
            if item and item.name:
                items.append(item)
        if not items:
            mock = filter_mock_places(q, lat=lat, lng=lng, size=size)
            return mock, "mock-fallback", "카카오 결과 없음 — mock 폴백"
        return items, "kakao", None
    except Exception as e:
        mock = filter_mock_places(q, lat=lat, lng=lng, size=size)
        return mock, "mock-fallback", f"카카오 검색 실패 ({type(e).__name__}) — mock 폴백"
