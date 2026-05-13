from fastapi import APIRouter

from app.catalog import PRESET_NAMES, PRESET_SHORT_LABELS
from app.schemas import PresetItem, PresetListResponse

router = APIRouter(tags=["presets"])


@router.get("/presets", response_model=PresetListResponse)
def list_presets() -> PresetListResponse:
    if len(PRESET_NAMES) != len(PRESET_SHORT_LABELS):
        raise RuntimeError("Preset name/label catalog length mismatch")
    items = [
        PresetItem(
            index=i,
            short_label=PRESET_SHORT_LABELS[i],
            display_name=PRESET_NAMES[i],
        )
        for i in range(len(PRESET_NAMES))
    ]
    return PresetListResponse(presets=items)
