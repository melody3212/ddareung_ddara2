from pydantic import BaseModel, Field


class Course(BaseModel):
    course_id: int
    title: str
    distance_km: float
    duration_min: int
    difficulty: str = Field(description="beginner | intermediate | advanced")
    tags: list[str] = []
    rating: float | None = None
    description: str | None = None
    path: list[list[float]] | None = None
