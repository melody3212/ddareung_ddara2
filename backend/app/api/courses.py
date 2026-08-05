from typing import Annotated

from fastapi import APIRouter, HTTPException, Query

from app.schemas.course import Course

router = APIRouter(prefix="/courses", tags=["courses"])

# path: [lng, lat] — 지도 폴리라인·길찾기 출발/도착용 (규칙 기반 mock)
MOCK_COURSES: list[Course] = [
    Course(
        course_id=1,
        title="여의도 샛강 라이딩",
        distance_km=8.5,
        duration_min=40,
        difficulty="beginner",
        tags=["#한강", "#평지", "#초보추천", "#루프"],
        rating=4.6,
        description="여의도 한강공원~샛강생태공원 평지 위주. 초보·가족 라이딩에 적합.",
        path=[
            [126.9245, 37.5219],
            [126.9280, 37.5245],
            [126.9326, 37.5270],
            [126.9365, 37.5285],
            [126.9400, 37.5300],
            [126.9445, 37.5290],
            [126.9480, 37.5265],
            [126.9450, 37.5230],
            [126.9390, 37.5210],
            [126.9320, 37.5200],
            [126.9260, 37.5205],
            [126.9245, 37.5219],
        ],
    ),
    Course(
        course_id=2,
        title="반포 달빛무지개 코스",
        distance_km=12.0,
        duration_min=55,
        difficulty="beginner",
        tags=["#야경", "#한강", "#평지"],
        rating=4.8,
        description="반포한강공원~잠수교 일대. 야경·분수쇼 시즌에 인기.",
        path=[
            [126.9950, 37.5100],
            [126.9985, 37.5115],
            [127.0020, 37.5130],
            [127.0060, 37.5145],
            [127.0100, 37.5155],
            [127.0150, 37.5160],
            [127.0200, 37.5150],
            [127.0240, 37.5135],
            [127.0280, 37.5120],
            [127.0245, 37.5105],
            [127.0180, 37.5095],
            [127.0100, 37.5090],
            [127.0020, 37.5095],
            [126.9967, 37.5105],
            [126.9950, 37.5100],
        ],
    ),
    Course(
        course_id=3,
        title="남산 둘레 도전",
        distance_km=10.2,
        duration_min=70,
        difficulty="intermediate",
        tags=["#언덕", "#전망", "#도심"],
        rating=4.3,
        description="남산 일대 완만한 오르막과 도심 전망. 중급 체력 추천.",
        path=[
            [126.9880, 37.5510],
            [126.9905, 37.5525],
            [126.9930, 37.5540],
            [126.9915, 37.5560],
            [126.9890, 37.5575],
            [126.9860, 37.5580],
            [126.9835, 37.5565],
            [126.9820, 37.5545],
            [126.9830, 37.5525],
            [126.9855, 37.5510],
            [126.9880, 37.5510],
        ],
    ),
    Course(
        course_id=4,
        title="한강 종주 입문",
        distance_km=25.0,
        duration_min=110,
        difficulty="advanced",
        tags=["#장거리", "#한강", "#운동"],
        rating=4.7,
        description="여의도에서 잠실 방향 한강 자전거길. 장거리 입문·페이스 유지 연습.",
        path=[
            [126.9245, 37.5219],
            [126.9400, 37.5280],
            [126.9550, 37.5270],
            [126.9680, 37.5250],
            [126.9780, 37.5300],
            [126.9900, 37.5280],
            [127.0050, 37.5250],
            [127.0200, 37.5220],
            [127.0350, 37.5200],
            [127.0500, 37.5190],
            [127.0650, 37.5180],
            [127.0824, 37.5178],
        ],
    ),
    Course(
        course_id=5,
        title="뚝섬~잠실 강변 라이딩",
        distance_km=9.0,
        duration_min=45,
        difficulty="beginner",
        tags=["#한강", "#평지", "#초보추천"],
        rating=4.5,
        description="뚝섬한강공원에서 잠실 방향 평지 구간. 짧은 왕복에 좋음.",
        path=[
            [127.0660, 37.5290],
            [127.0700, 37.5260],
            [127.0740, 37.5230],
            [127.0780, 37.5200],
            [127.0824, 37.5178],
            [127.0860, 37.5165],
            [127.0900, 37.5155],
            [127.0860, 37.5145],
            [127.0800, 37.5160],
            [127.0740, 37.5190],
            [127.0680, 37.5230],
            [127.0660, 37.5290],
        ],
    ),
    Course(
        course_id=6,
        title="망원~여의도 석양 코스",
        distance_km=14.0,
        duration_min=65,
        difficulty="intermediate",
        tags=["#한강", "#야경", "#운동"],
        rating=4.6,
        description="망원한강공원에서 여의도까지. 석양 타임 인기 구간.",
        path=[
            [126.8960, 37.5550],
            [126.9000, 37.5500],
            [126.9050, 37.5450],
            [126.9100, 37.5400],
            [126.9150, 37.5350],
            [126.9200, 37.5300],
            [126.9245, 37.5219],
            [126.9280, 37.5250],
            [126.9326, 37.5270],
        ],
    ),
]


@router.get("", response_model=list[Course])
def list_courses(
    difficulty: Annotated[
        str | None,
        Query(description="beginner | intermediate | advanced"),
    ] = None,
    tag: Annotated[
        str | None,
        Query(description="태그 부분일치 (예: 한강, #한강)"),
    ] = None,
):
    items = list(MOCK_COURSES)
    if difficulty:
        key = difficulty.strip().lower()
        items = [c for c in items if c.difficulty == key]
    if tag:
        needle = tag.strip().lstrip("#").lower()
        items = [
            c
            for c in items
            if any(needle in t.lower().lstrip("#") for t in c.tags)
        ]
    return items


@router.get("/{course_id}", response_model=Course)
def get_course(course_id: int):
    for c in MOCK_COURSES:
        if c.course_id == course_id:
            return c
    raise HTTPException(status_code=404, detail="Course not found")
