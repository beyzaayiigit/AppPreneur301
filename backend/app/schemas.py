from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    service: str
    status: str
    timestamp: str


class MetaResponse(BaseModel):
    service: str = Field(description="Logical service name")
    version: str = Field(description="Backend package version")
    api_version: str = Field(description="Stable API prefix version")


class ClientConfigResponse(BaseModel):
    min_client_version: str = Field(
        description="Semantic version hint for optional update prompts"
    )
    maintenance: bool
    maintenance_message: str | None = None


class PresetItem(BaseModel):
    index: int = Field(ge=0, description="Zero-based index matching the frontend preset list")
    short_label: str
    display_name: str


class PresetListResponse(BaseModel):
    presets: list[PresetItem]
    pipeline_version_hint: int = Field(
        default=7,
        description="Optional hint for shader/pipeline compatibility; mirrors frontend PIPELINE_VERSION when relevant",
    )


class RootResponse(BaseModel):
    service: str
    docs: str
    health: str
    api_v1: str
    experience: str = Field(description="Curated tips, pillars, and spotlight for the welcome experience")
    suggest_styles: str = Field(description="Style Triad AI endpoint")


class TipItem(BaseModel):
    id: str
    title: str
    body: str


class PillarItem(BaseModel):
    id: str
    title: str
    subtitle: str
    icon: str


class Spotlight(BaseModel):
    preset_index: int = Field(ge=0, description="Index aligned with frontend preset list")
    preset_short_label: str
    badge: str
    title: str
    body: str
    cycle_label: str = Field(
        default="",
        description="Haftalık vitrin döngüsü açıklaması (ör. 15 görünüm, 7 günde bir)",
    )


class ExperienceResponse(BaseModel):
    tips: list[TipItem]
    pillars: list[PillarItem]
    spotlight: Spotlight
    tagline: str
    refreshed_at: str


class EditRecipeResponse(BaseModel):
    """Edit recipe aligned with frontend EditState (snake_case API)."""

    preset_index: int = Field(ge=0, le=15)
    preset_intensity: float = Field(ge=0, le=100)
    exposure: float = Field(ge=-2, le=2)
    contrast: float = Field(ge=0.5, le=1.5)
    saturation: float = Field(ge=0, le=2)
    temperature: float = Field(ge=-1, le=1)
    pop: float = Field(ge=0, le=1)
    sharpness: float = Field(ge=0, le=2)
    fade: float = Field(ge=0, le=1)
    vignette: float = Field(ge=0, le=1)
    grain: float = Field(ge=0, le=1)
    selective_skin: float = Field(ge=-1, le=1)
    selective_sky: float = Field(ge=-1, le=1)
    selective_green: float = Field(ge=-1, le=1)
    selective_warm: float = Field(ge=-1, le=1)


class StyleDirection(BaseModel):
    id: str
    label: str
    tagline: str
    coach_tip: str = Field(
        default="",
        description="Optional Turkish manual-adjustment hint for the Adjust tab",
    )
    edit: EditRecipeResponse


class SuggestStylesRequest(BaseModel):
    prompt: str | None = Field(
        default=None,
        max_length=500,
        description="Optional natural-language style request in Turkish or English",
    )
    image_base64: str | None = Field(
        default=None,
        description="Low-res JPEG/PNG preview only; full-resolution image is not stored",
    )
    mime_type: str = Field(default="image/jpeg", pattern=r"^image/(jpeg|png|webp)$")


class SuggestStylesResponse(BaseModel):
    directions: list[StyleDirection] = Field(min_length=3, max_length=3)
    reasoning_tr: str
    source: str = Field(description="gemini | fallback")
