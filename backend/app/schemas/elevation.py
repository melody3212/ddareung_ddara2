from pydantic import BaseModel, Field


class PathCoords(BaseModel):
    """GeoJSON 순서: [lng, lat]"""

    path_id: str | int | None = None
    coordinates: list[list[float]] = Field(
        ...,
        min_length=2,
        description="[[lng, lat], ...]",
    )


class ProfileRequest(BaseModel):
    coordinates: list[list[float]] = Field(..., min_length=2)
    max_points: int = Field(40, ge=4, le=80)


class BatchProfileRequest(BaseModel):
    paths: list[PathCoords] = Field(..., min_length=1, max_length=40)
    max_points: int = Field(12, ge=4, le=30)


class GradeSegment(BaseModel):
    from_idx: int
    to_idx: int
    path: list[list[float]]
    distance_m: float
    elevation_delta_m: float
    grade_pct: float
    abs_grade_pct: float
    band: str
    color: str
    is_steep: bool


class ElevationPoint(BaseModel):
    lat: float | None
    lng: float | None
    elevation_m: float | None
    distance_m: float


class ElevationSummary(BaseModel):
    distance_m: float
    elevation_gain_m: float
    elevation_loss_m: float
    max_grade_pct: float
    avg_abs_grade_pct: float
    steep_distance_m: float
    steep_ratio: float


class ElevationProfile(BaseModel):
    source: str
    points: list[ElevationPoint]
    segments: list[GradeSegment]
    summary: ElevationSummary
    path_id: str | int | None = None


class BatchProfileResponse(BaseModel):
    source: str = "open-meteo"
    profiles: list[ElevationProfile]
    note: str = (
        "Open-Meteo DEM 기반. 카카오맵 앱 경사와 수치 불일치 가능. "
        "급경사 기준: |grade| ≥ 6%."
    )


class ElevationMeta(BaseModel):
    source: str
    docs: str = "https://open-meteo.com/en/docs/elevation-api"
    bands: dict[str, str]
    colors: dict[str, str]
    steep_threshold_pct: float
    note: str
    configured: bool = True
