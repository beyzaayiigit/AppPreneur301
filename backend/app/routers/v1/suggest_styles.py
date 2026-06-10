import logging

from fastapi import APIRouter, HTTPException

from app.schemas import SuggestStylesRequest, SuggestStylesResponse
from app.services.fallback_styles import build_fallback_response
from app.services.gemini import GeminiError, suggest_styles_with_gemini

logger = logging.getLogger(__name__)

router = APIRouter(tags=["ai"])


@router.post(
    "/suggest-styles",
    response_model=SuggestStylesResponse,
    summary="Style Triad — 3 AI style directions",
    description=(
        "Analyzes a low-resolution preview (optional) and user prompt via Gemini, "
        "returning three distinct edit recipes. Full-resolution images are never stored. "
        "Falls back to curated offline presets when the LLM is unavailable."
    ),
)
async def suggest_styles(body: SuggestStylesRequest) -> SuggestStylesResponse:
    if not body.image_base64 and not (body.prompt and body.prompt.strip()):
        raise HTTPException(
            status_code=400,
            detail="Provide image_base64 and/or a non-empty prompt",
        )

    try:
        result = await suggest_styles_with_gemini(
            prompt=body.prompt,
            image_base64=body.image_base64,
            mime_type=body.mime_type,
        )
        return result
    except GeminiError as exc:
        logger.warning("Gemini suggest-styles failed, using fallback: %s", exc)
        return build_fallback_response(body.prompt)
