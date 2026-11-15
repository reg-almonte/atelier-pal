"""CielabRuleEngineAdapter implementing ColorPairingPort."""

from collections.abc import Sequence

from app.application.ports import ColorPairingPort
from app.domain.models import ColorToken, GarmentSlot, Occasion, OutfitRecommendation
from app.domain.styling_rules import generate_computed_recommendations


class CielabRuleEngineAdapter(ColorPairingPort):
    """Adapter wrapping the pure domain CIELAB + 60-30-10 styling rule engine."""

    def generate_pairings(
        self,
        base_token: ColorToken,
        palette: Sequence[ColorToken],
        *,
        base_slot: GarmentSlot,
        occasion: Occasion,
        locked_slots: dict[GarmentSlot, ColorToken] | None = None,
        remix_seed: int = 0,
    ) -> list[OutfitRecommendation]:
        return generate_computed_recommendations(
            base_token=base_token,
            palette=palette,
            base_slot=base_slot,
            occasion=occasion,
            locked_slots=locked_slots,
            remix_seed=remix_seed,
        )
