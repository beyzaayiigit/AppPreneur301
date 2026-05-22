# Lumeris Backend

FastAPI servisi; istemci uygulaması (`frontend/`) ile ayrı çalışır. Ürün görüntüleri cihazda işler (**zero-server**); bu API meta, istemci ipuçları, ön ayar kataloğu ve **karşılama deneyimi** (ipuçları, vitrin) gibi **fotoğraf içermeyen** uçları sunar.

## Kurulum ve çalıştırma

```powershell
cd backend
py -m uv sync
py -m uv run uvicorn app.main:app --host 0.0.0.0 --port 3001 --reload
```

Geliştirme/test için `TestClient` kullanacaksanız (ör. `httpx`):

```powershell
py -m uv sync --group dev
```

Varsayılan adres: `http://localhost:3001`

## Ortam değişkenleri

| Değişken | Açıklama | Varsayılan |
|----------|-----------|------------|
| `HOST` | Uvicorn host (dokümantasyon / betikler için) | `0.0.0.0` |
| `PORT` | Uvicorn port | `3001` |
| `PUBLIC_BASE_URL` | `GET /` yanıtındaki mutlak URL önekleri | `http://127.0.0.1:3001` |
| `CORS_ALLOW_ORIGINS` | Virgülle ayrılmış origin listesi veya `*` | `*` |
| `LUMERIS_MIN_CLIENT_VERSION` | `GET /api/v1/config` içinde istemci sürüm ipucu | `1.0.0` |
| `LUMERIS_MAINTENANCE` | `1` / `true` / `yes` ise bakım modu | kapalı |
| `LUMERIS_MAINTENANCE_MESSAGE` | Bakım modunda istemciye gösterilebilecek kısa metin | yok |

## Uç noktalar

| Metot | Yol | Açıklama |
|--------|-----|----------|
| `GET` | `/` | Servis adı ve `docs`, `health`, `api/v1`, `experience` bağlantıları |
| `GET` | `/health` | Sağlık kontrolü (`status`, `timestamp`) |
| `GET` | `/api/v1/meta` | Servis ve API sürüm bilgisi |
| `GET` | `/api/v1/config` | İstemci için bakım / minimum sürüm ipuçları |
| `GET` | `/api/v1/presets` | Ön ayar listesi (`index`, `short_label`, `display_name`) — `frontend/src/engine/presets.ts` ile senkron tutulmalı |
| `GET` | `/api/v1/experience` | Karşılama için ipuçları, vitrin ön ayarı, ürün sütunları ve kısa slogan (JSON) |

İstemci (`frontend/`) karşılama ekranı `GET /api/v1/experience` ile aynı yapıyı isteğe bağlı çeker. `frontend/app.json` → `extra.lumerisApiBaseUrl`: Android emülatör için örnek `http://10.0.2.2:3001`, iOS simülatör için `http://127.0.0.1:3001`, fiziksel cihaz için bilgisayarın LAN IP’si. Boşsa uygulama yerleşik varsayılan metinleri kullanır.

OpenAPI: `http://localhost:3001/docs` ve `http://localhost:3001/redoc`
