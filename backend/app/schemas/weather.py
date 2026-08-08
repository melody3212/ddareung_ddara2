from pydantic import BaseModel, Field


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


class WeatherAlert(BaseModel):
    """라이딩 주의 안내 (조건 기반 · 공식 특보 아님)"""

    code: str
    level: str = Field(description="info | watch | warning")
    title: str
    message: str
    icon: str = "⚠️"
    source: str = "condition"


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
    # 해당 지역(수도권) + 조건 안내 → 라이딩 점수 카드
    alerts: list[WeatherAlert] = Field(default_factory=list)
    # 전국 기상특보 → 날씨 탭 하단
    alerts_all: list[WeatherAlert] = Field(default_factory=list)
    alerts_note: str | None = (
        "현재 기상·대기 조건 기반 안내입니다. 기상청 공식 특보와 다를 수 있습니다."
    )
    source: str = "mock"
