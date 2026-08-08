from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "따릉따라 API"
    env: str = "local"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    default_lat: float = 37.5665
    default_lng: float = 126.9780

    database_url: str | None = None
    jwt_secret: str | None = None
    kakao_rest_key: str | None = None
    seoul_openapi_key: str | None = None
    # 원본 VITE_BIKE_API_KEY 별칭 지원
    bike_api_key: str | None = None
    weather_api_key: str | None = None
    # 기상청 API 허브 인증키 — https://apihub.kma.go.kr/ (예특보·기상특보)
    kma_apihub_key: str | None = None
    air_api_key: str | None = None
    redis_url: str | None = None
    # 생활안전지도(safemap) 자전거길 WMS — https://www.safemap.go.kr/opna/data/dataViewRenew.do?objtId=219
    safemap_service_key: str | None = None

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
