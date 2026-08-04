from pydantic import BaseModel, Field


class PlaceItem(BaseModel):
    id: str
    name: str
    address: str | None = None
    road_address: str | None = None
    lat: float
    lng: float
    category: str | None = None
    phone: str | None = None
    distance_m: float | None = None
    place_url: str | None = None


class PlaceSearchResponse(BaseModel):
    query: str
    items: list[PlaceItem] = Field(default_factory=list)
    count: int = 0
    source: str = "mock"
    note: str | None = None


class PlaceMeta(BaseModel):
    source: str
    configured: bool
    note: str
    docs_url: str = "https://developers.kakao.com/docs/latest/ko/local/dev-guide"
    api_example: str = "https://dapi.kakao.com/v2/local/search/keyword.json?query={query}"
