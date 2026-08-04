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
