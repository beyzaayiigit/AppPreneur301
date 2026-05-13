import importlib.metadata
import tomllib
from pathlib import Path

from fastapi import APIRouter

from app.schemas import MetaResponse

router = APIRouter(tags=["meta"])


def _package_version() -> str:
    try:
        return importlib.metadata.version("lumeris-backend")
    except importlib.metadata.PackageNotFoundError:
        pass
    pyproject = Path(__file__).resolve().parents[3] / "pyproject.toml"
    try:
        data = tomllib.loads(pyproject.read_text(encoding="utf-8"))
        ver = data.get("project", {}).get("version")
        if isinstance(ver, str) and ver:
            return ver
    except OSError:
        pass
    return "0.0.0-dev"


@router.get("/meta", response_model=MetaResponse)
def meta() -> MetaResponse:
    return MetaResponse(
        service="lumeris-backend",
        version=_package_version(),
        api_version="v1",
    )
