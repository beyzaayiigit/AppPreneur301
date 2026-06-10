from datetime import datetime, timezone

from fastapi import APIRouter

from app.catalog import PRESET_NAMES, PRESET_SHORT_LABELS
from app.schemas import ExperienceResponse, PillarItem, Spotlight, TipItem
from app.spotlight_copy import WEEKLY_PRESET_COUNT, spotlight_body_for_index
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
        body="Az gren, sıcaklık ve fade ile birlikte mat film hissini güçlendirir; portrelerde düşük değerler genelde yeter.",
    ),
    TipItem(
        id="presets",
        title="Ön ayar + yoğunluk",
        body="Looks'ta bir stil seçin, ardından yoğunlukla karışımı damıtın; Adjust'ta pozlama ve kontrastla inceleyin.",
    ),
    TipItem(
        id="export",
        title="Dışa aktarma",
        body="Export'ta kaliteyi ihtiyaca göre seçin; büyük baskılar için daha yüksek kalite, hızlı paylaşım için standart yeterli olabilir.",
    ),
]

_PILLARS: list[PillarItem] = [
    PillarItem(
        id="privacy",
        title="Görüntü sunucuya uğramaz",
        subtitle="Düzenleme cihazınızda kalır; hesap veya bulut gerekmez.",
        icon="◎",
    ),
    PillarItem(
        id="craft",
        title="Analog his",
        subtitle="Ön ayarlar, gren ve fade ile tek nefeste sinematik doku.",
        icon="◐",
    ),
    PillarItem(
        id="calm",
        title="Sessiz ekran",
        subtitle="Reklam ve abonelik baskısı yok. Odak: fotoğrafınız ve kontroller.",
        icon="◇",
    ),
]


def _weekly_spotlight(now: datetime | None = None) -> Spotlight:
    dt = now or datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    weeks = int(dt.timestamp()) // 604800
    slot = weeks % WEEKLY_PRESET_COUNT
    idx = weekly_preset_catalog_index(dt)
    name = PRESET_NAMES[idx]
    short = PRESET_SHORT_LABELS[idx]
    slot_one = slot + 1
    return Spotlight(
        preset_index=idx,
        preset_short_label=short,
        badge=f"Haftanın ön ayarı · {slot_one}/{WEEKLY_PRESET_COUNT}",
        title=name,
        body=spotlight_body_for_index(idx, name),
    )


@router.get("/experience", response_model=ExperienceResponse)
def experience() -> ExperienceResponse:
    now = datetime.now(timezone.utc)
    return ExperienceResponse(
        tips=_TIPS,
        pillars=_PILLARS,
        spotlight=_weekly_spotlight(now),
        tagline="Lumeris, cihazınızda çalışan sessiz bir düzenleme alanı.",
        refreshed_at=now.isoformat(),
    )
