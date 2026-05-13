"""Haftalık ön ayar indeksi (1..15); mobil `weeklyPresetCatalogIndexUtc` ile aynı formül."""

from datetime import datetime, timezone


def weekly_preset_catalog_index(now: datetime | None = None) -> int:
    dt = now or datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    weeks = int(dt.timestamp()) // 604800
    return 1 + (weeks % 15)
