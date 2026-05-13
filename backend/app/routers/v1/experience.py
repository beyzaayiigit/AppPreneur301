from datetime import datetime, timezone

from fastapi import APIRouter

from app.catalog import PRESET_NAMES, PRESET_SHORT_LABELS
from app.schemas import ExperienceResponse, PillarItem, Spotlight, TipItem
from app.weekly_preset import weekly_preset_catalog_index

router = APIRouter(tags=["experience"])

_TIPS: list[TipItem] = [
    TipItem(
        id="compare",
        title="Karşılaştırma",
        body="Önizlemede basılı tutun: orijinalle düzenlenmişi yan yana hissedin; ince ayarları netleştirir.",
    ),
    TipItem(
        id="grain",
        title="Film greni",
        body="Az gren, sıcaklık ve fade ile birlikte ‘mat film’ hissini güçlendirir; portrelerde düşük değerler genelde yeter.",
    ),
    TipItem(
        id="presets",
        title="Ön ayar + yoğunluk",
        body="Looks’ta bir stil seçin, ardından yoğunlukla karışımı damıtın; Adjust’ta pozlama/kontrastla inceleyin.",
    ),
    TipItem(
        id="export",
        title="Dışa aktarma",
        body="Export’ta kaliteyi ihtiyaca göre seçin; büyük baskılar için daha yüksek kalite, hızlı paylaşım için HD yeterli olabilir.",
    ),
]

_PILLARS: list[PillarItem] = [
    PillarItem(
        id="privacy",
        title="Fotoğraf sunucuya gitmez",
        subtitle="Düzenleme ve dışa aktarma cihazınızda; hesap veya bulut şart değil.",
        icon="◎",
    ),
    PillarItem(
        id="craft",
        title="Analog his",
        subtitle="Ön ayarlar, gren, vignette ve fade ile tek tonda sinematik görünüm.",
        icon="◐",
    ),
    PillarItem(
        id="calm",
        title="Reklamsız sakinlik",
        subtitle="Odak: görüntü ve kontroller. Abonelik baskısı yok.",
        icon="◇",
    ),
]

def _weekly_spotlight(now: datetime | None = None) -> Spotlight:
    idx = weekly_preset_catalog_index(now)
    name = PRESET_NAMES[idx]
    short = PRESET_SHORT_LABELS[idx]
    return Spotlight(
        preset_index=idx,
        preset_short_label=short,
        badge="Bu haftanın ön ayarı",
        title=name,
        body=f"{name} — Looks’ta deneyin; yoğunlukla yumuşatın.",
    )


@router.get("/experience", response_model=ExperienceResponse)
def experience() -> ExperienceResponse:
    now = datetime.now(timezone.utc)
    return ExperienceResponse(
        tips=_TIPS,
        pillars=_PILLARS,
        spotlight=_weekly_spotlight(now),
        tagline="Işığı cihazınızda tutun — Lumeris düzenleme motoru tamamen yerel.",
        refreshed_at=now.isoformat(),
    )
