"""FastAPI application entrypoint."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.presentation.dependencies import get_settings
from app.presentation.router import router as v1_router


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Personal Styling Companion API",
        version=settings.app_version,
        description="Hexagonal Architecture backend for Dual-Track Color Pairing & AI Styling.",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(v1_router)
    return app


app = create_app()
