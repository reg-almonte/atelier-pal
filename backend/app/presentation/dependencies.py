"""FastAPI dependency injection wiring for Hexagonal ports & use cases."""

from functools import lru_cache

from fastapi import Depends

from app.application.ports import AIStylistPort, ColorPairingPort, TelemetryPort
from app.application.use_cases import (
    CheckAIHealthUseCase,
    GenerateOutfitRecommendationsUseCase,
    ListColorsUseCase,
    MatchColorUseCase,
)
from app.config import Settings
from app.infrastructure.cielab_rule_engine import CielabRuleEngineAdapter
from app.infrastructure.ollama_stylist import OllamaStylistAdapter
from app.infrastructure.telemetry import LoggingTelemetryAdapter


@lru_cache
def get_settings() -> Settings:
    return Settings()


def get_telemetry() -> TelemetryPort:
    return LoggingTelemetryAdapter()


def get_color_pairing_port() -> ColorPairingPort:
    return CielabRuleEngineAdapter()


def get_ai_stylist_port(settings: Settings = Depends(get_settings)) -> AIStylistPort:
    return OllamaStylistAdapter(
        base_url=settings.ollama_base_url,
        model=settings.ollama_model,
        timeout_seconds=settings.ollama_timeout_seconds,
    )


def get_list_colors_use_case() -> ListColorsUseCase:
    return ListColorsUseCase()


def get_match_color_use_case() -> MatchColorUseCase:
    return MatchColorUseCase()


def get_check_ai_health_use_case(
    ai_stylist: AIStylistPort = Depends(get_ai_stylist_port),
    telemetry: TelemetryPort = Depends(get_telemetry),
) -> CheckAIHealthUseCase:
    return CheckAIHealthUseCase(ai_stylist=ai_stylist, telemetry=telemetry)


def get_generate_recommendations_use_case(
    color_pairing: ColorPairingPort = Depends(get_color_pairing_port),
    ai_stylist: AIStylistPort = Depends(get_ai_stylist_port),
    telemetry: TelemetryPort = Depends(get_telemetry),
) -> GenerateOutfitRecommendationsUseCase:
    return GenerateOutfitRecommendationsUseCase(
        color_pairing=color_pairing,
        ai_stylist=ai_stylist,
        telemetry=telemetry,
    )
