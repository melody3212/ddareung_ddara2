from fastapi import APIRouter, HTTPException

from app.schemas.course import Course

router = APIRouter(prefix="/courses", tags=["courses"])


MOCK_COURSES: list[Course] = [
    Course(
        course_id=1,
        title="여의도 샛강 라이딩",
        distance_km=8.5,
        duration_min=40,
        difficulty="beginner",
        tags=["#한강", "#평지", "#초보추천"],
        rating=4.6,
        description="여의도 일대 평지 위주 코스.",
        path=[[126.9245, 37.5219], [126.9326, 37.5270], [126.9400, 37.5300]],
    ),
    Course(
        course_id=2,
        title="반포 달빛무지개 코스",
        distance_km=12.0,
        duration_min=55,
        difficulty="beginner",
        tags=["#야경", "#한강"],
        rating=4.8,
        description="반포대교 야경을 즐기는 코스.",
        path=[[126.9950, 37.5100], [126.9967, 37.5125], [127.0050, 37.5150]],
    ),
    Course(
        course_id=3,
        title="남산 둘레 도전",
        distance_km=10.2,
        duration_min=70,
        difficulty="intermediate",
        tags=["#언덕", "#전망"],
        rating=4.3,
        description="완만한 경사와 도심 전망.",
        path=[[126.9880, 37.5510], [126.9900, 37.5530], [126.9870, 37.5560]],
    ),
    Course(
        course_id=4,
        title="한강 종주 입문",
        distance_km=25.0,
        duration_min=110,
        difficulty="advanced",
        tags=["#장거리", "#한강"],
        rating=4.7,
        description="한강 자전거길을 따라 장거리 입문.",
        path=[[126.9245, 37.5219], [126.9780, 37.5300], [127.0824, 37.5178]],
    ),
]


@router.get("", response_model=list[Course])
def list_courses(difficulty: str | None = None):
    items = MOCK_COURSES
    if difficulty:
        items = [c for c in items if c.difficulty == difficulty]
    return items


@router.get("/{course_id}", response_model=Course)
def get_course(course_id: int):
    for c in MOCK_COURSES:
        if c.course_id == course_id:
            return c
    raise HTTPException(status_code=404, detail="Course not found")
