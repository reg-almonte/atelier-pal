"""Deterministic CIELAB + 60-30-10 & Sanzo Wada-inspired styling rules."""

from collections.abc import Sequence
from uuid import NAMESPACE_URL, uuid5

from app.domain.color_math import delta_e_2000
from app.domain.models import (
    ColorToken,
    ColorValue,
    GarmentSlot,
    Occasion,
    OutfitItem,
    OutfitRecommendation,
    RecommendationSource,
    RecommendationStrategy,
    Undertone,
)

COMPUTED_SOURCE_LABEL = "Computed · CIELAB + 60-30-10 Rules"

_OCCASION_TEXTURE_TIPS: dict[Occasion, str] = {
    Occasion.CASUAL: (
        "Pair matte cotton jersey or washed denim with textured knitwear or canvas."
    ),
    Occasion.SMART_CASUAL: (
        "Balance crisp poplin or fine-gauge merino with structured twill or suede."
    ),
    Occasion.OFFICE: (
        "Contrast worsted wool or pleated trousers with silk-blend or crisp oxford cloth."
    ),
    Occasion.DATE_NIGHT: (
        "Mix tactile fabrics like brushed cashmere, satin, or smooth leather for depth."
    ),
}

_OCCASION_LABELS: dict[Occasion, str] = {
    Occasion.CASUAL: "Casual",
    Occasion.SMART_CASUAL: "Smart Casual",
    Occasion.OFFICE: "Office",
    Occasion.DATE_NIGHT: "Date Night",
}


def _hue_distance(h1: float, h2: float) -> float:
    diff = abs(h1 - h2) % 360.0
    return 360.0 - diff if diff > 180.0 else diff


def _slot_layout(base_slot: GarmentSlot) -> tuple[GarmentSlot, GarmentSlot, GarmentSlot]:
    """Return (60% anchor slot, 30% secondary slot, 10% accent/footwear slot)."""
    if base_slot == GarmentSlot.BOTTOM:
        return (GarmentSlot.BOTTOM, GarmentSlot.TOP, GarmentSlot.FOOTWEAR)
    if base_slot == GarmentSlot.OUTERWEAR:
        return (GarmentSlot.OUTERWEAR, GarmentSlot.BOTTOM, GarmentSlot.FOOTWEAR)
    if base_slot == GarmentSlot.FOOTWEAR:
        return (GarmentSlot.BOTTOM, GarmentSlot.TOP, GarmentSlot.FOOTWEAR)
    if base_slot == GarmentSlot.ACCESSORY:
        return (GarmentSlot.TOP, GarmentSlot.BOTTOM, GarmentSlot.ACCESSORY)
    if base_slot == GarmentSlot.FULL_BODY:
        return (GarmentSlot.FULL_BODY, GarmentSlot.OUTERWEAR, GarmentSlot.FOOTWEAR)
    # Default: base is TOP -> bottom (60% or 30%) + top + footwear
    return (GarmentSlot.BOTTOM, GarmentSlot.TOP, GarmentSlot.FOOTWEAR)


def _compatible_undertone(a: ColorToken, b: ColorToken) -> bool:
    if a.undertone == Undertone.NEUTRAL or b.undertone == Undertone.NEUTRAL:
        return True
    return a.undertone == b.undertone


def _pick_candidate(
    candidates: Sequence[ColorToken],
    exclude_ids: set[str],
    remix_seed: int,
    fallback: Sequence[ColorToken],
) -> ColorToken:
    filtered = [c for c in candidates if c.id not in exclude_ids]
    pool = filtered if filtered else [c for c in fallback if c.id not in exclude_ids]
    if not pool:
        return fallback[0]
    return pool[remix_seed % len(pool)]


def _build_items(
    base_token: ColorToken,
    base_slot: GarmentSlot,
    secondary_token: ColorToken,
    accent_token: ColorToken,
    locked_slots: dict[GarmentSlot, ColorToken],
) -> tuple[OutfitItem, ...]:
    primary_slot, mid_slot, small_slot = _slot_layout(base_slot)
    ordered_slots = (primary_slot, mid_slot, small_slot)
    proportions = (60, 30, 10)

    # Assign base_token to base_slot; fill remaining slots with secondary & accent.
    slot_tokens: dict[GarmentSlot, ColorToken] = {}
    slot_tokens[base_slot] = base_token

    remaining_tokens = [secondary_token, accent_token]
    for slot in ordered_slots:
        if slot in locked_slots:
            slot_tokens[slot] = locked_slots[slot]
        elif slot not in slot_tokens:
            slot_tokens[slot] = remaining_tokens.pop(0)

    items: list[OutfitItem] = []
    for slot, pct in zip(ordered_slots, proportions, strict=True):
        tok = slot_tokens[slot]
        items.append(
            OutfitItem(
                slot=slot,
                hex=tok.hex,
                color_name=tok.name,
                matched_token_id=tok.id,
                proportion_percentage=pct,
            )
        )
    return tuple(items)


def _classic_pair(
    base: ColorToken,
    palette: Sequence[ColorToken],
    remix_seed: int,
) -> tuple[ColorToken, ColorToken, str]:
    neutrals = [
        t
        for t in palette
        if t.is_neutral and t.id != base.id and _compatible_undertone(base, t)
    ]
    # Prefer contrasting lightness for clean everyday readability
    contrasting = sorted(
        neutrals,
        key=lambda t: abs(t.lab.L - base.lab.L),
        reverse=True,
    )
    secondary = _pick_candidate(contrasting[:5], {base.id}, remix_seed, palette)

    # 10% accent: grounded dark neutral or cognac/metallic-adjacent neutral
    grounding = [
        t
        for t in palette
        if t.is_neutral
        and t.id not in {base.id, secondary.id}
        and t.value in {ColorValue.DARK, ColorValue.MEDIUM}
    ]
    accent = _pick_candidate(grounding, {base.id, secondary.id}, remix_seed, palette)
    rationale = (
        f"Anchors {base.name} with {secondary.name} (ΔL*={abs(base.lab.L - secondary.lab.L):.0f}) "
        f"and {accent.name} footwear/accent for effortless 60-30-10 balance."
    )
    return secondary, accent, rationale


def _tonal_pair(
    base: ColorToken,
    palette: Sequence[ColorToken],
    remix_seed: int,
) -> tuple[ColorToken, ColorToken, str]:
    # Close hue or same neutral temperature, stepped lightness
    candidates = sorted(
        [
            t
            for t in palette
            if t.id != base.id
            and (
                (base.is_neutral and t.is_neutral and _compatible_undertone(base, t))
                or (not base.is_neutral and _hue_distance(base.hsl.h, t.hsl.h) <= 42.0)
            )
        ],
        key=lambda t: abs(abs(t.lab.L - base.lab.L) - 24.0),
    )
    if len(candidates) < 2:
        candidates = sorted(
            [t for t in palette if t.id != base.id],
            key=lambda t: delta_e_2000(base.lab, t.lab),
        )
    secondary = _pick_candidate(candidates[:4], {base.id}, remix_seed, palette)
    accent = _pick_candidate(
        [t for t in candidates if t.id not in {base.id, secondary.id}][:4],
        {base.id, secondary.id},
        remix_seed + 1,
        palette,
    )
    rationale = (
        f"Monochromatic tonal gradient pairing {base.name} with {secondary.name} "
        f"and {accent.name} using stepped CIELAB lightness for quiet sophistication."
    )
    return secondary, accent, rationale


def _contrast_pair(
    base: ColorToken,
    palette: Sequence[ColorToken],
    remix_seed: int,
) -> tuple[ColorToken, ColorToken, str]:
    if base.is_neutral:
        # For neutrals, contrast means introducing a rich statement color + crisp opposing neutral
        statements = [
            t
            for t in palette
            if not t.is_neutral and abs(t.lab.L - base.lab.L) >= 18.0
        ]
        secondary = _pick_candidate(statements, {base.id}, remix_seed, palette)
    else:
        # Complementary / split-complementary hue (140..220 deg)
        complements = sorted(
            [t for t in palette if t.id != base.id and not t.is_neutral],
            key=lambda t: abs(_hue_distance(base.hsl.h, t.hsl.h) - 180.0),
        )
        secondary = _pick_candidate(complements[:4], {base.id}, remix_seed, palette)

    # Ground the contrast with a crisp neutral
    ground_neutrals = sorted(
        [t for t in palette if t.is_neutral and t.id not in {base.id, secondary.id}],
        key=lambda t: abs(t.lab.L - base.lab.L),
        reverse=True,
    )
    accent = _pick_candidate(ground_neutrals[:4], {base.id, secondary.id}, remix_seed, palette)
    rationale = (
        f"Balanced contrast combining {base.name} with {secondary.name}, "
        f"grounded by {accent.name} at 10% so the focal pairing stays wearable."
    )
    return secondary, accent, rationale


def _editorial_pair(
    base: ColorToken,
    palette: Sequence[ColorToken],
    remix_seed: int,
) -> tuple[ColorToken, ColorToken, str]:
    # Sanzo Wada-inspired triadic/analogous seasonal pairing (shared season tag + ~90-140 deg hue)
    base_seasons = set(base.season_tags) - {"all_season"}
    seasonal = [
        t
        for t in palette
        if t.id != base.id
        and not t.is_neutral
        and (not base_seasons or bool(base_seasons & set(t.season_tags)))
    ]
    triadic = sorted(
        seasonal if seasonal else [t for t in palette if not t.is_neutral and t.id != base.id],
        key=lambda t: abs(_hue_distance(base.hsl.h, t.hsl.h) - 115.0),
    )
    secondary = _pick_candidate(triadic[:5], {base.id}, remix_seed, palette)

    # Editorial neutral bridge (ivory, camel, espresso, or charcoal)
    bridges = [
        t
        for t in palette
        if t.is_neutral
        and t.id not in {base.id, secondary.id}
        and _compatible_undertone(base, t)
    ]
    accent = _pick_candidate(bridges, {base.id, secondary.id}, remix_seed, palette)
    rationale = (
        f"Sanzo Wada-inspired seasonal harmony uniting {base.name}, {secondary.name}, "
        f"and {accent.name} with curated undertone cohesion."
    )
    return secondary, accent, rationale


def generate_computed_recommendations(
    base_token: ColorToken,
    palette: Sequence[ColorToken],
    *,
    base_slot: GarmentSlot = GarmentSlot.TOP,
    occasion: Occasion = Occasion.SMART_CASUAL,
    locked_slots: dict[GarmentSlot, ColorToken] | None = None,
    remix_seed: int = 0,
) -> list[OutfitRecommendation]:
    """Generate 4 deterministic 60-30-10 outfit recommendations across 4 strategies."""
    locked = locked_slots or {}
    texture_tip = _OCCASION_TEXTURE_TIPS[occasion]
    occasion_name = _OCCASION_LABELS[occasion]

    strategy_builders = (
        (RecommendationStrategy.CLASSIC, _classic_pair),
        (RecommendationStrategy.TONAL, _tonal_pair),
        (RecommendationStrategy.CONTRAST, _contrast_pair),
        (RecommendationStrategy.EDITORIAL, _editorial_pair),
    )

    recommendations: list[OutfitRecommendation] = []
    for strategy, builder in strategy_builders:
        secondary, accent, rationale = builder(base_token, palette, remix_seed)
        items = _build_items(base_token, base_slot, secondary, accent, locked)
        rec_id = str(
            uuid5(
                NAMESPACE_URL,
                f"computed:{base_token.id}:{base_slot}:{occasion}:{strategy}:{remix_seed}:"
                + ",".join(f"{i.slot}={i.matched_token_id}" for i in items),
            )
        )
        recommendations.append(
            OutfitRecommendation(
                id=rec_id,
                source=RecommendationSource.MATH_ENGINE,
                source_label=COMPUTED_SOURCE_LABEL,
                strategy=strategy,
                items=items,
                styling_rationale=f"[{occasion_name}] {rationale}",
                fabric_texture_tip=texture_tip,
            )
        )

    return recommendations
