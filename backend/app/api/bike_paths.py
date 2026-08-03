from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/bike-paths", tags=["bike-paths"])


class BikePath(BaseModel):
    path_id: int
    name: str | None = None
    grade: str | None = None  # easy | normal | hard
    # GeoJSON-like coordinates [lng, lat]
    coordinates: list[list[float]]
    is_disconnected: bool = False


MOCK_PATHS: list[BikePath] = [
    BikePath(
        path_id=1,
        name="한강 자전거길 (여의도~이촌)",
        grade="easy",
        coordinates=[
            [126.9245, 37.5219],
            [126.9500, 37.5200],
            [126.9700, 37.5180],
            [126.9900, 37.5170],
        ],
    ),
    BikePath(
        path_id=2,
        name="청계천 구간 (샘플)",
        grade="normal",
        coordinates=[
            [126.9780, 37.5690],
            [126.9900, 37.5695],
            [127.0050, 37.5700],
        ],
    ),
]


@router.get("", response_model=list[BikePath])
def list_bike_paths():
    return MOCK_PATHS
