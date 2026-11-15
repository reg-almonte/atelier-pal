"""Application-layer Input/Output DTOs."""

from dataclasses import dataclass, field

from app.domain.models import (
    ColorMatchResult,
    ColorToken,
    GarmentSlot,
    Occasion,
    OutfitRecommendation,
    WardrobeItem,
)


@dataclass(frozen=True, slots=True)
class ColorMatchInput:
    hex_color: str


@dataclass(frozen=True, slots=True)
class ColorMatchOutput:
    result: ColorMatchResult


@dataclass(frozen=True, slots=True)
class RecommendationInput:
    base_color_hex: str | None = None
    base_token_id: str | None = None
    base_slot: GarmentSlot = GarmentSlot.TOP
    occasion: Occasion = Occasion.SMART_CASUAL
    locked_slots: dict[GarmentSlot, str] = field(default_factory=dict)  # slot -> token_id
    remix_seed: int = 0


@dataclass(frozen=True, slots=True)
class AIStatusOutput:
    available: bool
    configured_model: str
    active_model: str | None
    installed_models: list[str]
    base_url: str
    message: str
    setup_instructions: str | None = None


@dataclass(frozen=True, slots=True)
class DualTrackOutput:
    base_token: ColorToken
    computed: list[OutfitRecommendation]
    ai_generated: list[OutfitRecommendation]
    ai_status: AIStatusOutput


@dataclass(frozen=True, slots=True)
class SaveLookInput:
    item: WardrobeItem
