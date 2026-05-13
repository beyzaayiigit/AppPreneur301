from fastapi import APIRouter

from app.routers.v1 import config as config_routes
from app.routers.v1 import experience as experience_routes
from app.routers.v1 import meta as meta_routes
from app.routers.v1 import presets as presets_routes

api_router = APIRouter()
api_router.include_router(meta_routes.router)
api_router.include_router(config_routes.router)
api_router.include_router(presets_routes.router)
api_router.include_router(experience_routes.router)
