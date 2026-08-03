from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.services.riding_score import WeatherInputs, compute_riding_score
from app.services.weather_service import fetch_weather_bundle

router = APIRouter(prefix="/weather", tags=["weather"])


class HourlyItem(BaseModel):
    time: str
    hour: int
    temp_c: float
    feels_like_c: float
    precip_prob: float
    weather_code: int
    condition: str
    icon: str
    wind_ms: float
    humidity: float


class WeatherResponse(BaseModel):
    lat: float
    lng: float
    location_name: str = "서울"
    temp_c: float
    feels_like_c: float
    precip_prob: float
    humidity: float
    wind_ms: float
    weather_code: int = 0
    condition: str = "맑음"
    icon: str = "☀️"
    pm10: float | None = None
    pm25: float | None = None
    dust: float | None = None
    pm10_grade: int
    pm25_grade: int = 1
    dust_grade: int = 1
    pm10_label: str
    pm25_label: str = "정보없음"
    dust_label: str = "정보없음"
    score: int
    message: str
    hourly: list[HourlyItem] = Field(default_factory=list)
    source: str = "mock"


def _mock(lat: float, lng: float) -> WeatherResponse:
    inputs = WeatherInputs(
        temp_c=22.0,
        feels_like_c=21.0,
        precip_prob=10.0,
        humidity=45.0,
        wind_ms=2.5,
        pm10_grade=1,
        pm25_grade=1,
        dust_grade=1,
        weather_code=0,
    )
    score, message = compute_riding_score(inputs)
    hourly = [
        HourlyItem(
            time=f"mock-{h}",
            hour=(12 + h) % 24,
            temp_c=22.0 - h * 0.3,
            feels_like_c=21.0 - h * 0.2,
            precip_prob=10.0 + h,
            weather_code=0 if h < 3 else 2,
            condition="맑음" if h < 3 else "부분 흐림",
            icon="☀️" if h < 3 else "⛅",
            wind_ms=2.0,
            humidity=45.0,
        )
        for h in range(12)
    ]
    return WeatherResponse(
        lat=lat,
        lng=lng,
        location_name="서울 (mock)",
        temp_c=inputs.temp_c,
        feels_like_c=inputs.feels_like_c,
        precip_prob=inputs.precip_prob,
        humidity=inputs.humidity,
        wind_ms=inputs.wind_ms,
        weather_code=0,
        condition="맑음",
        icon="☀️",
        pm10=25.0,
        pm25=12.0,
        dust=10.0,
        pm10_grade=1,
        pm25_grade=1,
        dust_grade=1,
        pm10_label="좋음",
        pm25_label="좋음",
        dust_label="좋음",
        score=score,
        message=message,
        hourly=hourly,
        source="mock",
    )


@router.get("", response_model=WeatherResponse)
async def get_weather(
    lat: float | None = Query(default=None),
    lng: float | None = Query(default=None),
):
    settings = get_settings()
    lat = lat if lat is not None else settings.default_lat
    lng = lng if lng is not None else settings.default_lng

    try:
        data = await fetch_weather_bundle(lat, lng)
        return WeatherResponse(**data)
    except Exception as e:
        # 네트워크 실패 시 mock (개발 편의)
        mock = _mock(lat, lng)
        mock.message = f"{mock.message} (실시간 조회 실패: {type(e).__name__})"
        mock.source = "mock-fallback"
        return mock
