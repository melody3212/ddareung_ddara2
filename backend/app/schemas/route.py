from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.elevation import ElevationSummary, GradeSegment


class LatLng(BaseModel):
    lat: float = Field(..., ge=30.0, le=45.0)
    lng: float = Field(..., ge=120.0, le=135.0)


class RouteSearchRequest(BaseModel):
    origin: LatLng
    destination: LatLng
    mode: Literal["personal", "ddareung"] = "personal"
    preference: Literal["safe", "fast", "scenic"] = "safe"
    via: list[list[float]] | None = None


class NavStep(BaseModel):
    instruction: str
    maneuver_type: str = ""
    modifier: str | None = None
    road_name: str | None = None
    distance_m: float = 0
    duration_s: float = 0
    lat: float
    lng: float
    distance_along_m: float = 0
    leg_kind: Literal["walk", "bike"] = "bike"
    icon: str = "straight"


class RouteLeg(BaseModel):
    kind: Literal["walk", "bike"]
    from_label: str
    to_label: str
    path: list[list[float]]
    distance_m: float
    duration_min: int | None = None
    grade_summary: ElevationSummary | None = None
    steps: list[NavStep] = Field(default_factory=list)


class RouteSearchResult(BaseModel):
    route_id: str
    mode: Literal["personal", "ddareung"]
    preference: str
    distance_m: float
    duration_min: int
    path: list[list[float]]
    elevation: ElevationSummary
    segments: list[GradeSegment] = Field(default_factory=list)
    legs: list[RouteLeg] = Field(default_factory=list)
    steps: list[NavStep] = Field(default_factory=list)
    walk_distance_m: float | None = None
    bike_distance_m: float | None = None
    walk_duration_min: int | None = None
    bike_duration_min: int | None = None
    notes: list[str] = Field(default_factory=list)
    is_stub: bool = False


class RouteSearchResponse(BaseModel):
    routes: list[RouteSearchResult]
    source: str = "osrm+elevation"
