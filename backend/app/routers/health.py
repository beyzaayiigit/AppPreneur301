from datetime import datetime, timezone

from fastapi import APIRouter

from app.schemas import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        service="lumeris-backend",
        status="ok",
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
