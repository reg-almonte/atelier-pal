"""Pure domain entities and value objects."""

from dataclasses import dataclass, field
from enum import StrEnum


class Undertone(StrEnum):
    WARM = "warm"
    COOL = "cool"
    NEUTRAL = "neutral"


class ColorValue(StrEnum):
    LIGHT = "light"
    MEDIUM = "medium"
    DARK = "dark"


class GarmentSlot(StrEnum):
    TOP = "top"
    BOTTOM = "bottom"
    OUTERWEAR = "outerwear"
    FOOTWEAR = "footwear"
    ACCESSORY = "accessory"
    FULL_BODY = "full_body"


class Occasion(StrEnum):
    CASUAL = "casual"
    SMART_CASUAL = "smart_casual"
    OFFICE = "office"
    DATE_NIGHT = "date_night"


class RecommendationSource(StrEnum):
    MATH_ENGINE = "math_engine"
    OLLAMA_AI = "ollama_ai"


class RecommendationStrategy(StrEnum):
    CLASSIC = "classic"
    TONAL = "tonal"
    CONTRAST = "contrast"
    EDITORIAL = "editorial"
    AI_CURATED = "ai_curated"


@dataclass(frozen=True, slots=True)
class HSL:
    h: float  # 0..360
    s: float  # 0..100
    l: float  # noqa: E741 - standard HSL lightness 0..100


@dataclass(frozen=True, slots=True)
class LabColor:
    L: float  # 0..100
    a: float  # ~ -128..127
    b: float  # ~ -128..127


@dataclass(frozen=True, slots=True)
class ColorToken:
    id: str
    name: str
    hex: str
    hsl: HSL
    lab: LabColor
    is_neutral: bool
    undertone: Undertone
    value: ColorValue
    season_tags: tuple[str, ...] = field(default_factory=tuple)


@dataclass(frozen=True, slots=True)
class WardrobeItem:
    id: str
    slot: GarmentSlot
    primary_color_id: str
    name: str
    secondary_color_ids: tuple[str, ...] = field(default_factory=tuple)
    is_virtual: bool = True
    image_ref: str | None = None


@dataclass(frozen=True, slots=True)
class OutfitItem:
    slot: GarmentSlot
    hex: str
    color_name: str
    matched_token_id: str
    proportion_percentage: int


@dataclass(frozen=True, slots=True)
class OutfitRecommendation:
    id: str
    source: RecommendationSource
    source_label: str
    strategy: RecommendationStrategy
    items: tuple[OutfitItem, ...]
    styling_rationale: str
    fabric_texture_tip: str | None = None


@dataclass(frozen=True, slots=True)
class ColorMatchResult:
    input_hex: str
    matched_token: ColorToken
    delta_e: float
