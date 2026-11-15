"""Unit tests for deterministic 60-30-10 CIELAB styling rule engine."""

from app.domain.models import (
    GarmentSlot,
    Occasion,
    RecommendationSource,
    RecommendationStrategy,
)
from app.domain.palette import PALETTE_BY_ID, WARDROBE_PALETTE
from app.domain.styling_rules import generate_computed_recommendations


def test_computed_recommendations_cover_4_strategies_and_60_30_10() -> None:
    base = PALETTE_BY_ID["midnight-navy"]
    recs = generate_computed_recommendations(
        base,
        WARDROBE_PALETTE,
        base_slot=GarmentSlot.TOP,
        occasion=Occasion.OFFICE,
    )
    assert len(recs) == 4
    strategies = {r.strategy for r in recs}
    assert strategies == {
        RecommendationStrategy.CLASSIC,
        RecommendationStrategy.TONAL,
        RecommendationStrategy.CONTRAST,
        RecommendationStrategy.EDITORIAL,
    }
    for rec in recs:
        assert rec.source == RecommendationSource.MATH_ENGINE
        assert "Computed" in rec.source_label
        assert sum(item.proportion_percentage for item in rec.items) == 100
        assert any(
            item.slot == GarmentSlot.TOP and item.matched_token_id == base.id
            for item in rec.items
        )


def test_lock_and_remix_preserves_locked_slot() -> None:
    base = PALETTE_BY_ID["terracotta"]
    locked_shoe = PALETTE_BY_ID["espresso-brown"]
    recs_seed_0 = generate_computed_recommendations(
        base,
        WARDROBE_PALETTE,
        base_slot=GarmentSlot.TOP,
        occasion=Occasion.CASUAL,
        locked_slots={GarmentSlot.FOOTWEAR: locked_shoe},
        remix_seed=0,
    )
    recs_seed_1 = generate_computed_recommendations(
        base,
        WARDROBE_PALETTE,
        base_slot=GarmentSlot.TOP,
        occasion=Occasion.CASUAL,
        locked_slots={GarmentSlot.FOOTWEAR: locked_shoe},
        remix_seed=1,
    )
    for rec in recs_seed_0 + recs_seed_1:
        shoe_items = [i for i in rec.items if i.slot == GarmentSlot.FOOTWEAR]
        assert len(shoe_items) == 1
        assert shoe_items[0].matched_token_id == "espresso-brown"
