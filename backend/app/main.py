import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI

load_dotenv(Path(__file__).resolve().parent.parent / ".env")
from fastapi.middleware.cors import CORSMiddleware

from app.routers.health import router as health_router
from app.routers.v1 import api_router as api_v1_router
from app.schemas import RootResponse


def parse_port(value: str | None) -> int:
    default_port = 3001
    if value is None:
        return default_port
    try:
        parsed = int(value)
        return parsed if parsed > 0 else default_port
    except ValueError:
        return default_port


HOST = os.getenv("HOST", "0.0.0.0")
PORT = parse_port(os.getenv("PORT"))

app = FastAPI(
    title="Lumeris Backend",
    version="1.0.0",
    description=(
        "Lumeris AI backend: Style Triad (Gemini vision + structured edit recipes), "
        "preset catalog, welcome experience, and health checks. "
        "Only low-resolution previews are sent for AI analysis; images are not stored."
    ),
)

_cors_raw = os.getenv("CORS_ALLOW_ORIGINS", "*").strip()
_cors_origins = [o.strip() for o in _cors_raw.split(",") if o.strip()] or ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(api_v1_router, prefix="/api/v1")


def public_base_url() -> str:
    return os.getenv("PUBLIC_BASE_URL", "http://127.0.0.1:3001").rstrip("/")


@app.get("/", response_model=RootResponse)
def root() -> RootResponse:
    base = public_base_url()
    return RootResponse(
        service="lumeris-backend",
        docs=f"{base}/docs",
        health=f"{base}/health",
        api_v1=f"{base}/api/v1",
        experience=f"{base}/api/v1/experience",
        suggest_styles=f"{base}/api/v1/suggest-styles",
    )
