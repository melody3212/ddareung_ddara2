from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import bike_paths, courses, health, stations, weather
from app.core.config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        description="따릉따라 API — MVP (mock data) → 공공·기상 연동 확장",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    api = FastAPI()  # not used; mount routers under /api via prefix
    # Register under /api
    for r in (health.router, stations.router, courses.router, weather.router, bike_paths.router):
        app.include_router(r, prefix="/api")

    @app.get("/")
    def root():
        return {
            "service": settings.app_name,
            "docs": "/docs",
            "health": "/api/health",
        }

    return app


app = create_app()
