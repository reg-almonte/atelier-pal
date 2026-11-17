"""Abstract Ports (interfaces) for the Application layer."""

from abc import ABC, abstractmethod
from collections.abc import Sequence

from app.application.dtos import AIStatusOutput
from app.domain.models import (
    ColorToken,
    GarmentSlot,
    Occasion,
    OutfitRecommendation,
    WardrobeItem,
)


class ColorPairingPort(ABC):
    """Port for deterministic mathematical/rule-based outfit color pairing."""

    @abstractmethod
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
        """Return computed outfit recommendations."""


class AIStylistPort(ABC):
    """Port for LLM-based outfit recommendation generation and health checks."""

    @abstractmethod
    async def check_health(self) -> AIStatusOutput:
        """Check whether the AI provider is reachable and has a usable model."""

    @abstractmethod
    async def generate_pairings(
        self,
        base_token: ColorToken,
        palette: Sequence[ColorToken],
        *,
        base_slot: GarmentSlot,
        occasion: Occasion,
        locked_slots: dict[GarmentSlot, ColorToken] | None = None,
    ) -> list[OutfitRecommendation]:
        """Generate AI-curated outfit recommendations."""


class WardrobeRepositoryPort(ABC):
    """Port for persisting and retrieving wardrobe items."""

    @abstractmethod
    async def list_items(self) -> list[WardrobeItem]:
        """List all saved wardrobe items."""

    @abstractmethod
    async def save_item(self, item: WardrobeItem) -> WardrobeItem:
        """Persist a wardrobe item."""


class TelemetryPort(ABC):
    """Port for structured observability events."""

    @abstractmethod
    def record_event(self, name: str, attributes: dict[str, str | int | float | bool]) -> None:
        """Record an application telemetry event."""
