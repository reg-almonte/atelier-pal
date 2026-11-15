"""Pydantic v2 API request and response schemas."""

from pydantic import BaseModel, Field

from app.domain.models import (
    ColorValue,
    GarmentSlot,
    Occasion,
    RecommendationSource,
    RecommendationStrategy,
    Undertone,
)


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str
    service: str = "personal-styling-companion"


class HSLSchema(BaseModel):
    h: float
    s: float
    l: float  # noqa: E741


class LabColorSchema(BaseModel):
    L: float
    a: float
    b: float


class ColorTokenSchema(BaseModel):
    id: str
    name: str
    hex: str
    hsl: HSLSchema
    lab: LabColorSchema
    is_neutral: bool
    undertone: Undertone
    value: ColorValue
    season_tags: list[str]


class ColorPaletteResponse(BaseModel):
    colors: list[ColorTokenSchema]
    total: int


class ColorMatchRequest(BaseModel):
    hex_color: str = Field(examples=["#2A3B4C"])


class ColorMatchResponse(BaseModel):
    input_hex: str
    matched_token: ColorTokenSchema
    delta_e: float


class AIStatusResponse(BaseModel):
    available: bool
    configured_model: str
    active_model: str | None
    installed_models: list[str]
    base_url: str
    message: str
    setup_instructions: str | None = None


class RecommendationRequest(BaseModel):
    base_color_hex: str | None = Field(default=None, examples=["#1E293B"])
    base_token_id: str | None = Field(default=None, examples=["midnight-navy"])
    base_slot: GarmentSlot = GarmentSlot.TOP
    occasion: Occasion = Occasion.SMART_CASUAL
    locked_slots: dict[GarmentSlot, str] = Field(default_factory=dict)
    remix_seed: int = Field(default=0, ge=0)


class OutfitItemSchema(BaseModel):
    slot: GarmentSlot
    hex: str
    color_name: str
    matched_token_id: str
    proportion_percentage: int


class OutfitRecommendationSchema(BaseModel):
    id: str
    source: RecommendationSource
    source_label: str
    strategy: RecommendationStrategy
    items: list[OutfitItemSchema]
    styling_rationale: str
    fabric_texture_tip: str | None = None


class RecommendationsResponse(BaseModel):
    base_token: ColorTokenSchema
    recommendations: list[OutfitRecommendationSchema]


class DualTrackRecommendationsResponse(BaseModel):
    base_token: ColorTokenSchema
    computed: list[OutfitRecommendationSchema]
    ai_generated: list[OutfitRecommendationSchema]
    ai_status: AIStatusResponse
