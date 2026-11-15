"""Application Use Cases orchestrating domain logic and ports."""

from collections.abc import Sequence

from app.application.dtos import (
    AIStatusOutput,
    ColorMatchInput,
    ColorMatchOutput,
    DualTrackOutput,
    RecommendationInput,
    SaveLookInput,
)
from app.application.ports import (
    AIStylistPort,
    ColorPairingPort,
    TelemetryPort,
    WardrobeRepositoryPort,
)
from app.domain.color_math import find_nearest_color_token
from app.domain.exceptions import (
    AIStylistUnavailableError,
    ColorTokenNotFoundError,
    InvalidColorError,
)
from app.domain.models import ColorToken, GarmentSlot, OutfitRecommendation, WardrobeItem
from app.domain.palette import WARDROBE_PALETTE, get_token_by_id


class ListColorsUseCase:
    """Returns the curated wardrobe ColorToken palette."""

    def __init__(self, palette: Sequence[ColorToken] = WARDROBE_PALETTE) -> None:
        self._palette = palette

    def execute(self) -> list[ColorToken]:
        return list(self._palette)


class MatchColorUseCase:
    """Snaps an arbitrary hex color to the nearest ColorToken via CIELAB."""

    def __init__(self, palette: Sequence[ColorToken] = WARDROBE_PALETTE) -> None:
        self._palette = palette

    def execute(self, data: ColorMatchInput) -> ColorMatchOutput:
        result = find_nearest_color_token(data.hex_color, self._palette)
        return ColorMatchOutput(result=result)


class CheckAIHealthUseCase:
    """Checks Ollama availability and resolves active model with auto-fallback."""

    def __init__(self, ai_stylist: AIStylistPort, telemetry: TelemetryPort) -> None:
        self._ai_stylist = ai_stylist
        self._telemetry = telemetry

    async def execute(self) -> AIStatusOutput:
        status = await self._ai_stylist.check_health()
        self._telemetry.record_event(
            "ai_health_checked",
            {
                "available": status.available,
                "active_model": status.active_model or "none",
            },
        )
        return status


class GenerateOutfitRecommendationsUseCase:
    """Generates Track A (Computed), Track B (AI), or Dual-Track recommendations."""

    def __init__(
        self,
        color_pairing: ColorPairingPort,
        ai_stylist: AIStylistPort,
        telemetry: TelemetryPort,
        palette: Sequence[ColorToken] = WARDROBE_PALETTE,
    ) -> None:
        self._color_pairing = color_pairing
        self._ai_stylist = ai_stylist
        self._telemetry = telemetry
        self._palette = palette

    def _resolve_base_token(self, data: RecommendationInput) -> ColorToken:
        if data.base_token_id:
            token = get_token_by_id(data.base_token_id)
            if token is None:
                raise ColorTokenNotFoundError(
                    f"Unknown base_token_id: {data.base_token_id!r}"
                )
            return token
        if data.base_color_hex:
            match = find_nearest_color_token(data.base_color_hex, self._palette)
            return match.matched_token
        raise InvalidColorError("Either base_token_id or base_color_hex must be provided.")

    def _resolve_locked_slots(
        self, locked_slots: dict[GarmentSlot, str]
    ) -> dict[GarmentSlot, ColorToken]:
        resolved: dict[GarmentSlot, ColorToken] = {}
        for slot, token_id in locked_slots.items():
            tok = get_token_by_id(token_id)
            if tok is None:
                raise ColorTokenNotFoundError(f"Unknown locked token_id: {token_id!r}")
            resolved[slot] = tok
        return resolved

    def generate_computed(
        self, data: RecommendationInput
    ) -> tuple[ColorToken, list[OutfitRecommendation]]:
        base_token = self._resolve_base_token(data)
        locked = self._resolve_locked_slots(data.locked_slots)
        recs = self._color_pairing.generate_pairings(
            base_token,
            self._palette,
            base_slot=data.base_slot,
            occasion=data.occasion,
            locked_slots=locked,
            remix_seed=data.remix_seed,
        )
        self._telemetry.record_event(
            "computed_recommendations_generated",
            {
                "base_token_id": base_token.id,
                "occasion": data.occasion.value,
                "count": len(recs),
            },
        )
        return base_token, recs

    async def generate_ai(
        self, data: RecommendationInput
    ) -> tuple[ColorToken, list[OutfitRecommendation]]:
        base_token = self._resolve_base_token(data)
        recs = await self._ai_stylist.generate_pairings(
            base_token,
            self._palette,
            base_slot=data.base_slot,
            occasion=data.occasion,
        )
        self._telemetry.record_event(
            "ai_recommendations_generated",
            {
                "base_token_id": base_token.id,
                "occasion": data.occasion.value,
                "count": len(recs),
            },
        )
        return base_token, recs

    async def generate_dual_track(self, data: RecommendationInput) -> DualTrackOutput:
        base_token, computed = self.generate_computed(data)
        ai_status = await self._ai_stylist.check_health()
        ai_generated: list[OutfitRecommendation] = []
        if ai_status.available:
            try:
                _, ai_generated = await self.generate_ai(data)
            except AIStylistUnavailableError:
                ai_generated = []
        return DualTrackOutput(
            base_token=base_token,
            computed=computed,
            ai_generated=ai_generated,
            ai_status=ai_status,
        )


class SaveLookUseCase:
    """Persists a WardrobeItem via WardrobeRepositoryPort (v0.0.2+ foundation)."""

    def __init__(self, repository: WardrobeRepositoryPort) -> None:
        self._repository = repository

    async def execute(self, data: SaveLookInput) -> WardrobeItem:
        return await self._repository.save_item(data.item)
