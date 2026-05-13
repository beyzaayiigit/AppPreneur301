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
    index: int = Field(ge=0, description="Zero-based index matching the mobile preset list")
    short_label: str
    display_name: str


class PresetListResponse(BaseModel):
    presets: list[PresetItem]
    pipeline_version_hint: int = Field(
        default=7,
        description="Optional hint for shader/pipeline compatibility; mirrors mobile PIPELINE_VERSION when relevant",
    )


class RootResponse(BaseModel):
    service: str
    docs: str
    health: str
    api_v1: str
    experience: str = Field(description="Curated tips, pillars, and spotlight for the welcome experience")


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
    preset_index: int = Field(ge=0, description="Index aligned with mobile preset list")
    preset_short_label: str
    badge: str
    title: str
    body: str


class ExperienceResponse(BaseModel):
    tips: list[TipItem]
    pillars: list[PillarItem]
    spotlight: Spotlight
    tagline: str
    refreshed_at: str
