"""Explicit Domain <-> Presentation/Application DTO mappers."""

from app.application.dtos import AIStatusOutput, DualTrackOutput, RecommendationInput
from app.domain.models import (
    ColorMatchResult,
    ColorToken,
    OutfitItem,
    OutfitRecommendation,
)
from app.presentation.schemas import (
    AIStatusResponse,
    ColorMatchResponse,
    ColorTokenSchema,
    DualTrackRecommendationsResponse,
    HSLSchema,
    LabColorSchema,
    OutfitItemSchema,
    OutfitRecommendationSchema,
    RecommendationRequest,
)


def domain_token_to_schema(token: ColorToken) -> ColorTokenSchema:
    return ColorTokenSchema(
        id=token.id,
        name=token.name,
        hex=token.hex,
        hsl=HSLSchema(h=token.hsl.h, s=token.hsl.s, l=token.hsl.l),
        lab=LabColorSchema(L=token.lab.L, a=token.lab.a, b=token.lab.b),
        is_neutral=token.is_neutral,
        undertone=token.undertone,
        value=token.value,
        season_tags=list(token.season_tags),
    )


def domain_match_to_schema(match: ColorMatchResult) -> ColorMatchResponse:
    return ColorMatchResponse(
        input_hex=match.input_hex,
        matched_token=domain_token_to_schema(match.matched_token),
        delta_e=match.delta_e,
    )


def domain_item_to_schema(item: OutfitItem) -> OutfitItemSchema:
    return OutfitItemSchema(
        slot=item.slot,
        hex=item.hex,
        color_name=item.color_name,
        matched_token_id=item.matched_token_id,
        proportion_percentage=item.proportion_percentage,
    )


def domain_recommendation_to_schema(
    rec: OutfitRecommendation,
) -> OutfitRecommendationSchema:
    return OutfitRecommendationSchema(
        id=rec.id,
        source=rec.source,
        source_label=rec.source_label,
        strategy=rec.strategy,
        items=[domain_item_to_schema(item) for item in rec.items],
        styling_rationale=rec.styling_rationale,
        fabric_texture_tip=rec.fabric_texture_tip,
    )


def domain_ai_status_to_schema(status: AIStatusOutput) -> AIStatusResponse:
    return AIStatusResponse(
        available=status.available,
        configured_model=status.configured_model,
        active_model=status.active_model,
        installed_models=status.installed_models,
        base_url=status.base_url,
        message=status.message,
        setup_instructions=status.setup_instructions,
    )


def domain_dual_track_to_schema(
    output: DualTrackOutput,
) -> DualTrackRecommendationsResponse:
    return DualTrackRecommendationsResponse(
        base_token=domain_token_to_schema(output.base_token),
        computed=[domain_recommendation_to_schema(r) for r in output.computed],
        ai_generated=[domain_recommendation_to_schema(r) for r in output.ai_generated],
        ai_status=domain_ai_status_to_schema(output.ai_status),
    )


def request_to_recommendation_input(req: RecommendationRequest) -> RecommendationInput:
    return RecommendationInput(
        base_color_hex=req.base_color_hex,
        base_token_id=req.base_token_id,
        base_slot=req.base_slot,
        occasion=req.occasion,
        locked_slots=req.locked_slots,
        remix_seed=req.remix_seed,
    )
