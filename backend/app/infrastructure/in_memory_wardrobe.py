"""In-memory WardrobeRepositoryPort adapter (v0.0.1 placeholder for DB)."""

from app.application.ports import WardrobeRepositoryPort
from app.domain.models import WardrobeItem


class InMemoryWardrobeRepository(WardrobeRepositoryPort):
    """Simple in-memory store for WardrobeItem entities."""

    def __init__(self) -> None:
        self._items: dict[str, WardrobeItem] = {}

    async def list_items(self) -> list[WardrobeItem]:
        return list(self._items.values())

    async def save_item(self, item: WardrobeItem) -> WardrobeItem:
        self._items[item.id] = item
        return item
