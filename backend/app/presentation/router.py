"""FastAPI v1 REST API router (Driving Adapter)."""

from fastapi import APIRouter, Depends, HTTPException, status

from app.application.dtos import ColorMatchInput
from app.application.use_cases import (
    CheckAIHealthUseCase,
    GenerateOutfitRecommendationsUseCase,
    ListColorsUseCase,
    MatchColorUseCase,
)
from app.config import Settings
from app.domain.exceptions import (
    AIStylistUnavailableError,
    ColorTokenNotFoundError,
    InvalidColorError,
)
from app.infrastructure.mappers import (
    domain_ai_status_to_schema,
    domain_dual_track_to_schema,
    domain_match_to_schema,
    domain_recommendation_to_schema,
    domain_token_to_schema,
    request_to_recommendation_input,
)
from app.presentation.dependencies import (
    get_check_ai_health_use_case,
    get_generate_recommendations_use_case,
    get_list_colors_use_case,
    get_match_color_use_case,
    get_settings,
)
from app.presentation.schemas import (
    AIStatusResponse,
    ColorMatchRequest,
    ColorMatchResponse,
    ColorPaletteResponse,
    DualTrackRecommendationsResponse,
    HealthResponse,
    RecommendationRequest,
    RecommendationsResponse,
)

router = APIRouter(prefix="/api/v1", tags=["v1"])


@router.get("/health", response_model=HealthResponse)
async def health_check(settings: Settings = Depends(get_settings)) -> HealthResponse:
    return HealthResponse(version=settings.app_version)


@router.get("/system/ai-status", response_model=AIStatusResponse)
async def ai_status(
    use_case: CheckAIHealthUseCase = Depends(get_check_ai_health_use_case),
) -> AIStatusResponse:
    result = await use_case.execute()
    return domain_ai_status_to_schema(result)


@router.get("/colors", response_model=ColorPaletteResponse)
async def list_colors(
    use_case: ListColorsUseCase = Depends(get_list_colors_use_case),
) -> ColorPaletteResponse:
    tokens = use_case.execute()
    return ColorPaletteResponse(
        colors=[domain_token_to_schema(t) for t in tokens],
        total=len(tokens),
    )


@router.post("/colors/match", response_model=ColorMatchResponse)
async def match_color(
    payload: ColorMatchRequest,
    use_case: MatchColorUseCase = Depends(get_match_color_use_case),
) -> ColorMatchResponse:
    try:
        output = use_case.execute(ColorMatchInput(hex_color=payload.hex_color))
    except InvalidColorError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail={"code": "INVALID_COLOR", "message": str(exc)},
        ) from exc
    return domain_match_to_schema(output.result)


@router.post("/recommendations/computed", response_model=RecommendationsResponse)
async def computed_recommendations(
    payload: RecommendationRequest,
    use_case: GenerateOutfitRecommendationsUseCase = Depends(
        get_generate_recommendations_use_case
    ),
) -> RecommendationsResponse:
    try:
        base_token, recs = use_case.generate_computed(
            request_to_recommendation_input(payload)
        )
    except InvalidColorError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail={"code": "INVALID_COLOR", "message": str(exc)},
        ) from exc
    except ColorTokenNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "COLOR_TOKEN_NOT_FOUND", "message": str(exc)},
        ) from exc

    return RecommendationsResponse(
        base_token=domain_token_to_schema(base_token),
        recommendations=[domain_recommendation_to_schema(r) for r in recs],
    )


@router.post("/recommendations/ai", response_model=RecommendationsResponse)
async def ai_recommendations(
    payload: RecommendationRequest,
    use_case: GenerateOutfitRecommendationsUseCase = Depends(
        get_generate_recommendations_use_case
    ),
) -> RecommendationsResponse:
    try:
        base_token, recs = await use_case.generate_ai(
            request_to_recommendation_input(payload)
        )
    except InvalidColorError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail={"code": "INVALID_COLOR", "message": str(exc)},
        ) from exc
    except ColorTokenNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "COLOR_TOKEN_NOT_FOUND", "message": str(exc)},
        ) from exc
    except AIStylistUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "OLLAMA_UNAVAILABLE",
                "message": str(exc),
                "setup_hint": exc.setup_hint,
            },
        ) from exc

    return RecommendationsResponse(
        base_token=domain_token_to_schema(base_token),
        recommendations=[domain_recommendation_to_schema(r) for r in recs],
    )


@router.post(
    "/recommendations/dual-track",
    response_model=DualTrackRecommendationsResponse,
)
async def dual_track_recommendations(
    payload: RecommendationRequest,
    use_case: GenerateOutfitRecommendationsUseCase = Depends(
        get_generate_recommendations_use_case
    ),
) -> DualTrackRecommendationsResponse:
    try:
        output = await use_case.generate_dual_track(
            request_to_recommendation_input(payload)
        )
    except InvalidColorError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail={"code": "INVALID_COLOR", "message": str(exc)},
        ) from exc
    except ColorTokenNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "COLOR_TOKEN_NOT_FOUND", "message": str(exc)},
        ) from exc

    return domain_dual_track_to_schema(output)
