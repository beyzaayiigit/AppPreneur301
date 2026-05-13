import os

from fastapi import APIRouter

from app.schemas import ClientConfigResponse

router = APIRouter(tags=["config"])


@router.get("/config", response_model=ClientConfigResponse)
def client_config() -> ClientConfigResponse:
    maintenance = os.getenv("LUMERIS_MAINTENANCE", "").lower() in ("1", "true", "yes")
    message = os.getenv("LUMERIS_MAINTENANCE_MESSAGE")
    return ClientConfigResponse(
        min_client_version=os.getenv("LUMERIS_MIN_CLIENT_VERSION", "1.0.0"),
        maintenance=maintenance,
        maintenance_message=message if maintenance else None,
    )
