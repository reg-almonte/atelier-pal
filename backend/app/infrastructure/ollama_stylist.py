"""OllamaStylistAdapter implementing AIStylistPort via Ollama REST API."""

from collections.abc import Sequence
from uuid import uuid4

import httpx
from pydantic import BaseModel, Field, ValidationError

from app.application.dtos import AIStatusOutput
from app.application.ports import AIStylistPort
from app.domain.color_math import find_nearest_color_token, normalize_hex
from app.domain.exceptions import AIStylistUnavailableError, InvalidColorError
from app.domain.models import (
    ColorToken,
    GarmentSlot,
    Occasion,
    OutfitItem,
    OutfitRecommendation,
    RecommendationSource,
    RecommendationStrategy,
)


class _OllamaItemSchema(BaseModel):
    slot: GarmentSlot
    hex: str = Field(description="Hex color code like #1E293B")
    color_name: str
    proportion_percentage: int = Field(ge=5, le=85)


class _OllamaOutfitSchema(BaseModel):
    items: list[_OllamaItemSchema] = Field(min_length=3, max_length=4)
    styling_rationale: str
    fabric_texture_tip: str


class _OllamaOutfitResponse(BaseModel):
    outfits: list[_OllamaOutfitSchema] = Field(min_length=2, max_length=3)


class OllamaStylistAdapter(AIStylistPort):
    """Concrete AIStylistPort adapter communicating with local Ollama."""

    def __init__(
        self,
        base_url: str = "http://localhost:11434",
        model: str = "llama3.2",
        timeout_seconds: float = 45.0,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._configured_model = model
        self._timeout = timeout_seconds
        self._injected_client = client

    def _resolve_model(self, installed: list[str]) -> str | None:
        if not installed:
            return None
        for name in installed:
            if name == self._configured_model or name == f"{self._configured_model}:latest":
                return name
        for name in installed:
            if name.startswith(f"{self._configured_model}:"):
                return name
        return installed[0]

    async def _get_tags(self) -> list[str]:
        if self._injected_client is not None:
            resp = await self._injected_client.get(
                f"{self._base_url}/api/tags", timeout=5.0
            )
            resp.raise_for_status()
            payload = resp.json()
        else:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{self._base_url}/api/tags")
                resp.raise_for_status()
                payload = resp.json()
        models = payload.get("models", [])
        return [str(m["name"]) for m in models if isinstance(m, dict) and "name" in m]

    async def check_health(self) -> AIStatusOutput:
        setup_cmd = f"ollama pull {self._configured_model}"
        try:
            installed = await self._get_tags()
        except (httpx.RequestError, httpx.HTTPStatusError) as exc:
            return AIStatusOutput(
                available=False,
                configured_model=self._configured_model,
                active_model=None,
                installed_models=[],
                base_url=self._base_url,
                message=f"Ollama is offline or unreachable ({exc.__class__.__name__}).",
                setup_instructions=(
                    f"Start Ollama locally (ollama serve) and run: {setup_cmd}"
                ),
            )

        active = self._resolve_model(installed)
        if active is None:
            return AIStatusOutput(
                available=False,
                configured_model=self._configured_model,
                active_model=None,
                installed_models=[],
                base_url=self._base_url,
                message="Ollama is running, but no models are installed.",
                setup_instructions=f"Install the default model by running: {setup_cmd}",
            )

        fallback_note = (
            ""
            if active.startswith(self._configured_model)
            else f" (auto-fallback from {self._configured_model})"
        )
        return AIStatusOutput(
            available=True,
            configured_model=self._configured_model,
            active_model=active,
            installed_models=installed,
            base_url=self._base_url,
            message=f"Connected to Ollama using {active}{fallback_note}.",
            setup_instructions=None,
        )

    async def generate_pairings(
        self,
        base_token: ColorToken,
        palette: Sequence[ColorToken],
        *,
        base_slot: GarmentSlot,
        occasion: Occasion,
    ) -> list[OutfitRecommendation]:
        status = await self.check_health()
        if not status.available or not status.active_model:
            raise AIStylistUnavailableError(
                status.message,
                setup_hint=status.setup_instructions,
            )

        active_model = status.active_model
        system_prompt = (
            "You are an editorial personal stylist specializing in wearable color harmony "
            "and tactile fabric pairings. Propose 2 to 3 distinct, stylish outfit color "
            "combinations tailored to the user's anchor piece and occasion. "
            "Each outfit must contain 3 to 4 garment slots with valid hex codes (#RRGGBB) "
            "and proportions summing near 100."
        )
        user_prompt = (
            f"Anchor garment: {base_slot.value} in {base_token.name} ({base_token.hex}, "
            f"undertone: {base_token.undertone.value}, value: {base_token.value.value}).\n"
            f"Occasion: {occasion.value}.\n"
            "Return 2 to 3 complete outfit combinations as JSON matching the schema."
        )

        body = {
            "model": active_model,
            "stream": False,
            "think": False,
            "options": {"temperature": 0.4},
            "format": _OllamaOutfitResponse.model_json_schema(),
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        }

        try:
            if self._injected_client is not None:
                resp = await self._injected_client.post(
                    f"{self._base_url}/api/chat",
                    json=body,
                    timeout=self._timeout,
                )
                resp.raise_for_status()
                raw_json = resp.json()
            else:
                async with httpx.AsyncClient(timeout=self._timeout) as client:
                    resp = await client.post(f"{self._base_url}/api/chat", json=body)
                    resp.raise_for_status()
                    raw_json = resp.json()
        except (httpx.RequestError, httpx.HTTPStatusError) as exc:
            err_detail = str(exc) or exc.__class__.__name__
            raise AIStylistUnavailableError(
                f"Failed to query Ollama model {active_model}: {err_detail}",
                setup_hint=f"Verify Ollama is running and model {active_model} is available.",
            ) from exc

        content = raw_json.get("message", {}).get("content", "")
        try:
            parsed = _OllamaOutfitResponse.model_validate_json(content)
        except ValidationError as exc:
            raise AIStylistUnavailableError(
                f"Ollama returned invalid structured output: {exc}",
                setup_hint="Try regenerating or switching to a JSON-capable model like llama3.2.",
            ) from exc

        recommendations: list[OutfitRecommendation] = []
        for outfit in parsed.outfits:
            mapped_items: list[OutfitItem] = []
            for item in outfit.items:
                try:
                    normalized_hex = normalize_hex(item.hex)
                    match = find_nearest_color_token(normalized_hex, palette)
                    matched_id = match.matched_token.id
                except InvalidColorError:
                    normalized_hex = base_token.hex
                    matched_id = base_token.id

                mapped_items.append(
                    OutfitItem(
                        slot=item.slot,
                        hex=normalized_hex,
                        color_name=item.color_name,
                        matched_token_id=matched_id,
                        proportion_percentage=item.proportion_percentage,
                    )
                )

            recommendations.append(
                OutfitRecommendation(
                    id=str(uuid4()),
                    source=RecommendationSource.OLLAMA_AI,
                    source_label=f"AI Stylist · {active_model}",
                    strategy=RecommendationStrategy.AI_CURATED,
                    items=tuple(mapped_items),
                    styling_rationale=outfit.styling_rationale,
                    fabric_texture_tip=outfit.fabric_texture_tip,
                )
            )

        return recommendations
