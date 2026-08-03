from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.core.config import get_settings
from app.services.riding_score import WeatherInputs, compute_riding_score

router = APIRouter(prefix="/weather", tags=["weather"])


class WeatherResponse(BaseModel):
    lat: float
    lng: float
    temp_c: float
    feels_like_c: float
    precip_prob: float
    humidity: float
    wind_ms: float
    pm10_grade: int
    pm10_label: str
    score: int
    message: str
    source: str = "mock"


PM_LABELS = {1: "좋음", 2: "보통", 3: "나쁨", 4: "매우나쁨"}


@router.get("", response_model=WeatherResponse)
def get_weather(
    lat: float | None = Query(default=None),
    lng: float | None = Query(default=None),
):
    """MVP: mock weather. Replace with real weather/air APIs + cache."""
    settings = get_settings()
    lat = lat if lat is not None else settings.default_lat
    lng = lng if lng is not None else settings.default_lng

    # Placeholder values — swap for OpenAPI/기상청 later
    inputs = WeatherInputs(
        temp_c=22.0,
        feels_like_c=21.0,
        precip_prob=10.0,
        humidity=45.0,
        wind_ms=2.5,
        pm10_grade=1,
    )
    score, message = compute_riding_score(inputs)

    return WeatherResponse(
        lat=lat,
        lng=lng,
        temp_c=inputs.temp_c,
        feels_like_c=inputs.feels_like_c,
        precip_prob=inputs.precip_prob,
        humidity=inputs.humidity,
        wind_ms=inputs.wind_ms,
        pm10_grade=inputs.pm10_grade,
        pm10_label=PM_LABELS.get(inputs.pm10_grade, "알수없음"),
        score=score,
        message=message,
        source="mock",
    )
