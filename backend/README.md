# Lumeris Backend

Bu servis, proje yapısında mobil istemciden ayrı konumlanan backend iskeletidir.

## Komutlar

```bash
py -m uv sync
py -m uv run uvicorn app.main:app --host 0.0.0.0 --port 3001 --reload
```

Varsayilan adres: `http://localhost:3001`

## Endpoint

- `GET /health` -> servis sagligini doner
