from pydantic import BaseModel, Field


class Station(BaseModel):
    station_id: str
    name: str
    lat: float
    lng: float
    bike_count: int | None = Field(default=None, description="대여 가능(주차) 대수")
    rack_tot_cnt: int | None = Field(default=None, description="거치대 개수")
    shared: float | None = Field(default=None, description="거치율 %")
