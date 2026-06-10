"""Deterministic Style Triad fallback when LLM is unavailable."""

from datetime import datetime, timezone

from app.catalog import PRESET_NAMES
from app.schemas import EditRecipeResponse, StyleDirection, SuggestStylesResponse
from app.services.edit_recipe import EditRecipe
from app.weekly_preset import weekly_preset_catalog_index

_FALLBACK_TRIPLETS: list[tuple[str, str, str, int, dict[str, float]]] = [
    (
        "warm_portrait",
        "Sıcak Portre",
        "Altın ışık ve yumuşak ten tonları",
        2,
        {"preset_intensity": 78, "temperature": 0.35, "grain": 0.12, "fade": 0.08, "vignette": 0.15},
    ),
    (
        "matte_film",
        "Mat Film",
        "Grenli, soluk film dokusu",
        15,
        {"preset_intensity": 72, "grain": 0.28, "fade": 0.22, "contrast": 0.95, "vignette": 0.2},
    ),
    (
        "cool_mood",
        "Soğuk Gece",
        "Derin mavi ve kontrastlı gölge",
        13,
        {"preset_intensity": 80, "temperature": -0.25, "contrast": 1.12, "saturation": 0.92, "vignette": 0.25},
    ),
    (
        "vintage_fade",
        "Vintage Solma",
        "Nostaljik soluk renkler",
        12,
        {"preset_intensity": 85, "fade": 0.35, "grain": 0.18, "saturation": 0.88},
    ),
    (
        "neon_night",
        "Neon Gece",
        "Canlı şehir ışıkları",
        10,
        {"preset_intensity": 70, "saturation": 1.25, "contrast": 1.15, "pop": 0.2},
    ),
]


def _recipe(preset_index: int, overrides: dict[str, float]) -> EditRecipe:
    base = EditRecipe(preset_index=preset_index)
    data = base.model_dump()
    data.update(overrides)
    return EditRecipe.model_validate(data)


def build_fallback_response(prompt: str | None = None) -> SuggestStylesResponse:
    now = datetime.now(timezone.utc)
    anchor = weekly_preset_catalog_index(now)
    start = anchor % len(_FALLBACK_TRIPLETS)
    picked = [_FALLBACK_TRIPLETS[(start + i) % len(_FALLBACK_TRIPLETS)] for i in range(3)]

    directions: list[StyleDirection] = []
    for fid, label, tagline, preset_idx, overrides in picked:
        recipe = _recipe(preset_idx, overrides)
        directions.append(
            StyleDirection(
                id=fid,
                label=label,
                tagline=tagline,
                edit=EditRecipeResponse.model_validate(recipe.model_dump()),
            )
        )

    preset_name = PRESET_NAMES[anchor]
    user_hint = f' "{prompt.strip()}"' if prompt and prompt.strip() else ""
    reasoning = (
        f"Çevrimdışı öneriler kullanıldı{user_hint}. "
        f"Haftanın ön ayarı {preset_name} ile uyumlu üç yön seçildi. "
        "Adjust sekmesinde Warmth, Grain ve Contrast ile ince ayar yapabilirsin."
    )
    return SuggestStylesResponse(
        directions=directions,
        reasoning_tr=reasoning,
        source="fallback",
    )
