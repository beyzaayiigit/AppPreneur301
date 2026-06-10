"""Edit recipe validation and defaults — mirrors frontend EditState ranges."""

from typing import Any

from pydantic import BaseModel, Field, field_validator

from app.catalog import PRESET_NAMES


class EditRecipe(BaseModel):
    preset_index: int = Field(default=0, ge=0, le=15)
    preset_intensity: float = Field(default=100, ge=0, le=100)
    exposure: float = Field(default=0, ge=-2, le=2)
    contrast: float = Field(default=1, ge=0.5, le=1.5)
    saturation: float = Field(default=1, ge=0, le=2)
    temperature: float = Field(default=0, ge=-1, le=1)
    pop: float = Field(default=0, ge=0, le=1)
    sharpness: float = Field(default=1, ge=0, le=2)
    fade: float = Field(default=0, ge=0, le=1)
    vignette: float = Field(default=0, ge=0, le=1)
    grain: float = Field(default=0, ge=0, le=1)
    selective_skin: float = Field(default=0, ge=-1, le=1)
    selective_sky: float = Field(default=0, ge=-1, le=1)
    selective_green: float = Field(default=0, ge=-1, le=1)
    selective_warm: float = Field(default=0, ge=-1, le=1)

    @field_validator("preset_index", mode="before")
    @classmethod
    def clamp_preset(cls, v: Any) -> int:
        try:
            n = int(v)
        except (TypeError, ValueError):
            return 0
        return max(0, min(15, n))

    @classmethod
    def from_loose_dict(cls, data: dict[str, Any]) -> "EditRecipe":
        """Accept camelCase or snake_case keys from LLM output."""
        key_map = {
            "presetIndex": "preset_index",
            "presetIntensity": "preset_intensity",
            "selectiveSkin": "selective_skin",
            "selectiveSky": "selective_sky",
            "selectiveGreen": "selective_green",
            "selectiveWarm": "selective_warm",
        }
        normalized: dict[str, Any] = {}
        for k, v in data.items():
            nk = key_map.get(k, k)
            normalized[nk] = v
        return cls.model_validate(normalized)


def preset_label(index: int) -> str:
    idx = max(0, min(15, index))
    return PRESET_NAMES[idx]
