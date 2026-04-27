import os
from datetime import datetime, timezone

from fastapi import FastAPI


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

app = FastAPI(title="Lumeris Backend", version="1.0.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "service": "lumeris-backend",
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
