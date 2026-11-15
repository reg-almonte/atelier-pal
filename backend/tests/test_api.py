"""Integration tests for FastAPI /api/v1 endpoints."""

from collections.abc import Sequence

from fastapi.testclient import TestClient

from app.application.dtos import AIStatusOutput
from app.application.ports import AIStylistPort
from app.domain.exceptions import AIStylistUnavailableError
from app.domain.models import ColorToken, GarmentSlot, Occasion, OutfitRecommendation
from app.main import create_app
from app.presentation.dependencies import get_ai_stylist_port


class _OfflineAIStub(AIStylistPort):
    async def check_health(self) -> AIStatusOutput:
        return AIStatusOutput(
            available=False,
            configured_model="llama3.2",
            active_model=None,
            installed_models=[],
            base_url="http://localhost:11434",
            message="Ollama offline in test",
            setup_instructions="ollama pull llama3.2",
        )

    async def generate_pairings(
        self,
        base_token: ColorToken,
        palette: Sequence[ColorToken],
        *,
        base_slot: GarmentSlot,
        occasion: Occasion,
    ) -> list[OutfitRecommendation]:
        raise AIStylistUnavailableError("Offline", setup_hint="ollama pull llama3.2")


def _make_client() -> TestClient:
    app = create_app()
    app.dependency_overrides[get_ai_stylist_port] = lambda: _OfflineAIStub()
    return TestClient(app)


def test_health_and_colors() -> None:
    client = _make_client()
    health = client.get("/api/v1/health")
    assert health.status_code == 200
    assert health.json()["version"] == "0.0.1"

    colors = client.get("/api/v1/colors")
    assert colors.status_code == 200
    assert colors.json()["total"] == 30


def test_match_color_and_computed_recommendations() -> None:
    client = _make_client()
    match_resp = client.post("/api/v1/colors/match", json={"hex_color": "#1E293B"})
    assert match_resp.status_code == 200
    assert match_resp.json()["matched_token"]["id"] == "midnight-navy"

    bad_match = client.post("/api/v1/colors/match", json={"hex_color": "not-a-color"})
    assert bad_match.status_code == 422

    comp_resp = client.post(
        "/api/v1/recommendations/computed",
        json={
            "base_token_id": "olive-drab",
            "base_slot": "top",
            "occasion": "smart_casual",
        },
    )
    assert comp_resp.status_code == 200
    data = comp_resp.json()
    assert len(data["recommendations"]) == 4
    assert all(r["source"] == "math_engine" for r in data["recommendations"])


def test_ai_offline_returns_503_and_dual_track_degrades_gracefully() -> None:
    client = _make_client()
    ai_resp = client.post(
        "/api/v1/recommendations/ai",
        json={"base_token_id": "olive-drab", "base_slot": "top", "occasion": "casual"},
    )
    assert ai_resp.status_code == 503
    assert ai_resp.json()["detail"]["code"] == "OLLAMA_UNAVAILABLE"

    dual_resp = client.post(
        "/api/v1/recommendations/dual-track",
        json={"base_token_id": "olive-drab", "base_slot": "top", "occasion": "casual"},
    )
    assert dual_resp.status_code == 200
    body = dual_resp.json()
    assert len(body["computed"]) == 4
    assert body["ai_generated"] == []
    assert body["ai_status"]["available"] is False
