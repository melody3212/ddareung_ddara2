from pydantic import BaseModel, Field


class Station(BaseModel):
    station_id: str
    name: str
    lat: float
    lng: float
    bike_count: int | None = Field(default=None, description="대여 가능(주차) 대수")
    rack_tot_cnt: int | None = Field(default=None, description="거치대 개수")
    shared: float | None = Field(default=None, description="거치율 %")


class StationsMeta(BaseModel):
    source: str
    count: int
    configured: bool
    cache_ttl_sec: int
    note: str
    docs_url: str = "https://data.seoul.go.kr/dataList/OA-15493/A/1/datasetView.do"
    api_example: str = "http://openapi.seoul.go.kr:8088/{KEY}/json/bikeList/1/1000/"
