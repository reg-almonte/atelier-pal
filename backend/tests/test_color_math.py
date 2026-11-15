"""Unit tests for pure domain CIELAB color math and 30-color palette."""

import pytest

from app.domain.color_math import (
    delta_e_2000,
    find_nearest_color_token,
    hex_to_lab,
    normalize_hex,
)
from app.domain.exceptions import InvalidColorError
from app.domain.palette import WARDROBE_PALETTE


def test_palette_has_30_unique_colors() -> None:
    assert len(WARDROBE_PALETTE) == 30
    ids = {t.id for t in WARDROBE_PALETTE}
    assert len(ids) == 30
    neutrals = [t for t in WARDROBE_PALETTE if t.is_neutral]
    statements = [t for t in WARDROBE_PALETTE if not t.is_neutral]
    assert len(neutrals) == 12
    assert len(statements) == 18


def test_hex_normalization_and_validation() -> None:
    assert normalize_hex("#abc") == "#AABBCC"
    assert normalize_hex("1e293b") == "#1E293B"
    with pytest.raises(InvalidColorError):
        normalize_hex("#ZZZZZZ")


def test_delta_e_2000_identity_and_symmetry() -> None:
    navy = hex_to_lab("#1E293B")
    ivory = hex_to_lab("#F5EFE6")
    assert delta_e_2000(navy, navy) == 0.0
    assert delta_e_2000(navy, ivory) == delta_e_2000(ivory, navy)
    assert delta_e_2000(navy, ivory) > 50.0


def test_find_nearest_color_token_exact_and_close() -> None:
    exact = find_nearest_color_token("#1E293B", WARDROBE_PALETTE)
    assert exact.matched_token.id == "midnight-navy"
    assert exact.delta_e == 0.0

    near_olive = find_nearest_color_token("#596D33", WARDROBE_PALETTE)
    assert near_olive.matched_token.id == "olive-drab"
    assert near_olive.delta_e < 5.0
