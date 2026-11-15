"""Unit tests for OllamaStylistAdapter with mocked httpx transport."""

import json

import httpx
import pytest

from app.domain.exceptions import AIStylistUnavailableError
from app.domain.models import GarmentSlot, Occasion, RecommendationSource
from app.domain.palette import PALETTE_BY_ID, WARDROBE_PALETTE
from app.infrastructure.ollama_stylist import OllamaStylistAdapter


@pytest.mark.asyncio
async def test_ollama_health_offline() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("Connection refused", request=request)

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    adapter = OllamaStylistAdapter(model="llama3.2", client=client)
    status = await adapter.check_health()
    assert status.available is False
    assert status.active_model is None
    assert "ollama pull llama3.2" in (status.setup_instructions or "")
    await client.aclose()


@pytest.mark.asyncio
async def test_ollama_health_auto_fallback_model() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"models": [{"name": "qwen2.5:7b"}]})

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    adapter = OllamaStylistAdapter(model="llama3.2", client=client)
    status = await adapter.check_health()
    assert status.available is True
    assert status.active_model == "qwen2.5:7b"
    assert "auto-fallback" in status.message
    await client.aclose()


@pytest.mark.asyncio
async def test_ollama_generate_pairings_structured_output() -> None:
    fake_ai_payload = {
        "outfits": [
            {
                "items": [
                    {
                        "slot": "top",
                        "hex": "#1E293B",
                        "color_name": "Midnight Navy",
                        "proportion_percentage": 30,
                    },
                    {
                        "slot": "bottom",
                        "hex": "#F5EFE6",
                        "color_name": "Cream Linen",
                        "proportion_percentage": 60,
                    },
                    {
                        "slot": "footwear",
                        "hex": "#8C4A27",
                        "color_name": "Cognac Loafer",
                        "proportion_percentage": 10,
                    },
                ],
                "styling_rationale": "Crisp nautical contrast softened by warm cognac leather.",
                "fabric_texture_tip": "Pair fine merino knit with pleated linen-cotton trousers.",
            },
            {
                "items": [
                    {
                        "slot": "top",
                        "hex": "#1E293B",
                        "color_name": "Midnight Navy",
                        "proportion_percentage": 35,
                    },
                    {
                        "slot": "bottom",
                        "hex": "#A3A8AE",
                        "color_name": "Flannel Grey",
                        "proportion_percentage": 55,
                    },
                    {
                        "slot": "footwear",
                        "hex": "#18181B",
                        "color_name": "Black Derby",
                        "proportion_percentage": 10,
                    },
                ],
                "styling_rationale": "Cool-toned tonal tailoring for sharp weekday polish.",
                "fabric_texture_tip": "Contrast brushed flannel with smooth calfskin.",
            },
        ]
    }

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/api/tags":
            return httpx.Response(200, json={"models": [{"name": "llama3.2:latest"}]})
        if request.url.path == "/api/chat":
            return httpx.Response(
                200,
                json={"message": {"content": json.dumps(fake_ai_payload)}},
            )
        return httpx.Response(404)

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    adapter = OllamaStylistAdapter(model="llama3.2", client=client)
    recs = await adapter.generate_pairings(
        PALETTE_BY_ID["midnight-navy"],
        WARDROBE_PALETTE,
        base_slot=GarmentSlot.TOP,
        occasion=Occasion.SMART_CASUAL,
    )
    assert len(recs) == 2
    assert recs[0].source == RecommendationSource.OLLAMA_AI
    assert recs[0].source_label == "AI Stylist · llama3.2:latest"
    assert recs[0].items[1].matched_token_id == "warm-ivory"
    await client.aclose()


@pytest.mark.asyncio
async def test_ollama_generate_pairings_raises_when_offline() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("Offline", request=request)

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    adapter = OllamaStylistAdapter(model="llama3.2", client=client)
    with pytest.raises(AIStylistUnavailableError):
        await adapter.generate_pairings(
            PALETTE_BY_ID["midnight-navy"],
            WARDROBE_PALETTE,
            base_slot=GarmentSlot.TOP,
            occasion=Occasion.CASUAL,
        )
    await client.aclose()
