"""Gemini Flash API client for Style Triad structured output."""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
from typing import Any

import httpx

from app.schemas import EditRecipeResponse, StyleDirection, SuggestStylesResponse
from app.services.edit_recipe import EditRecipe
from app.services.style_prompt import STYLE_TRIAD_SYSTEM, build_user_message

logger = logging.getLogger(__name__)

GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_TIMEOUT_SEC = float(os.getenv("GEMINI_TIMEOUT_SEC", "45"))
GEMINI_FALLBACK_MODELS = os.getenv("GEMINI_FALLBACK_MODELS", "gemini-2.0-flash,gemini-1.5-flash")
RETRYABLE_HTTP = frozenset({429, 500, 502, 503})
_RETRY_DELAYS_SEC = (1.0, 2.5, 5.0)


class GeminiError(Exception):
    pass


def _trim_reasoning(text: str, max_len: int = 360) -> str:
    """Yarım cümle bırakmadan güvenli kırpma; mümkünse son tam cümlede keser."""
    text = re.sub(r"\s+", " ", str(text).strip())
    if len(text) <= max_len:
        return text
    cut = text[:max_len]
    for sep in (". ", "! ", "? "):
        idx = cut.rfind(sep)
        if idx >= int(max_len * 0.45):
            return cut[: idx + 1].strip()
    space = cut.rfind(" ")
    if space >= int(max_len * 0.6):
        return cut[:space].strip()
    return cut.strip()


_EDIT_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "preset_index": {"type": "integer"},
        "preset_intensity": {"type": "number"},
        "exposure": {"type": "number"},
        "contrast": {"type": "number"},
        "saturation": {"type": "number"},
        "temperature": {"type": "number"},
        "pop": {"type": "number"},
        "sharpness": {"type": "number"},
        "fade": {"type": "number"},
        "vignette": {"type": "number"},
        "grain": {"type": "number"},
        "selective_skin": {"type": "number"},
        "selective_sky": {"type": "number"},
        "selective_green": {"type": "number"},
        "selective_warm": {"type": "number"},
    },
}

GEMINI_RESPONSE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "directions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "label": {"type": "string"},
                    "tagline": {"type": "string"},
                    "edit": _EDIT_SCHEMA,
                },
                "required": ["id", "label", "tagline", "edit"],
            },
        },
        "reasoning_tr": {"type": "string"},
    },
    "required": ["directions", "reasoning_tr"],
}


def _strip_trailing_commas(raw: str) -> str:
    return re.sub(r",\s*([}\]])", r"\1", raw)


def _isolate_json_object(text: str) -> str:
    cleaned = text.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned, re.IGNORECASE)
    if fence:
        cleaned = fence.group(1).strip()
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start >= 0 and end > start:
        cleaned = cleaned[start : end + 1]
    return _strip_trailing_commas(cleaned)


def _extract_json(text: str) -> dict[str, Any]:
    raw = _isolate_json_object(text)
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        snippet = raw[max(0, exc.pos - 48) : exc.pos + 48]
        logger.warning("Gemini JSON parse failed: %s | near: %r", exc, snippet)
        raise GeminiError(f"Invalid JSON from Gemini: {exc}") from exc
    if not isinstance(parsed, dict):
        raise GeminiError("Gemini JSON root must be an object")
    return parsed


def _parse_directions(payload: dict[str, Any]) -> SuggestStylesResponse:
    raw_dirs = payload.get("directions")
    if not isinstance(raw_dirs, list) or len(raw_dirs) < 1:
        raise GeminiError("Missing directions array")

    directions: list[StyleDirection] = []
    for item in raw_dirs[:3]:
        if not isinstance(item, dict):
            continue
        edit_raw = item.get("edit")
        if not isinstance(edit_raw, dict):
            edit_raw = {}
        recipe = EditRecipe.from_loose_dict(edit_raw)
        directions.append(
            StyleDirection(
                id=str(item.get("id", f"dir_{len(directions)}")),
                label=str(item.get("label", "Stil"))[:40],
                tagline=str(item.get("tagline", ""))[:80],
                coach_tip=str(item.get("coach_tip", ""))[:120],
                edit=EditRecipeResponse.model_validate(recipe.model_dump()),
            )
        )

    if len(directions) < 3:
        raise GeminiError(f"Expected 3 directions, got {len(directions)}")

    reasoning = _trim_reasoning(payload.get("reasoning_tr", "AI üç stil yönü önerdi."))
    return SuggestStylesResponse(
        directions=directions,
        reasoning_tr=reasoning,
        source="gemini",
    )


def _gemini_model_chain() -> list[str]:
    chain: list[str] = []
    for name in [GEMINI_MODEL, *GEMINI_FALLBACK_MODELS.split(",")]:
        name = name.strip()
        if name and name not in chain:
            chain.append(name)
    return chain


def _generation_config_for(model: str) -> dict[str, Any]:
    generation_config: dict[str, Any] = {
        "temperature": 0.55,
        "maxOutputTokens": 8192,
        "responseMimeType": "application/json",
        "responseSchema": GEMINI_RESPONSE_SCHEMA,
    }
    if "2.5" in model:
        generation_config["thinkingConfig"] = {"thinkingBudget": 0}
    return generation_config


def _build_request_body(
    *,
    prompt: str | None,
    image_base64: str | None,
    mime_type: str,
    model: str,
) -> dict[str, Any]:
    user_text = build_user_message(prompt, has_image=bool(image_base64))
    parts: list[dict[str, Any]] = [{"text": user_text}]
    if image_base64:
        parts.append(
            {
                "inline_data": {
                    "mime_type": mime_type,
                    "data": image_base64,
                }
            }
        )
    return {
        "system_instruction": {"parts": [{"text": STYLE_TRIAD_SYSTEM}]},
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": _generation_config_for(model),
    }


async def _post_generate_content(model: str, body: dict[str, Any]) -> httpx.Response:
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent"
    )
    async with httpx.AsyncClient(timeout=GEMINI_TIMEOUT_SEC) as client:
        return await client.post(
            url,
            params={"key": GEMINI_API_KEY},
            json=body,
        )


def _parse_generate_response(data: dict[str, Any]) -> SuggestStylesResponse:
    candidates = data.get("candidates") or []
    if not candidates:
        raise GeminiError("No candidates in Gemini response")

    finish = candidates[0].get("finishReason") or ""
    content = candidates[0].get("content") or {}
    text_parts = content.get("parts") or []
    text = ""
    for p in text_parts:
        if not isinstance(p, dict):
            continue
        if p.get("thought") is True:
            continue
        if "text" in p:
            text += p["text"]
    if not text.strip():
        raise GeminiError("Empty Gemini text response")

    try:
        payload = _extract_json(text)
        return _parse_directions(payload)
    except GeminiError as exc:
        if finish == "MAX_TOKENS":
            raise GeminiError("Gemini response truncated (MAX_TOKENS)") from exc
        raise
    except Exception as exc:
        raise GeminiError(f"Failed to parse Gemini response: {exc}") from exc


async def suggest_styles_with_gemini(
    *,
    prompt: str | None,
    image_base64: str | None,
    mime_type: str = "image/jpeg",
) -> SuggestStylesResponse:
    if not GEMINI_API_KEY:
        raise GeminiError("GEMINI_API_KEY not configured")

    last_error: GeminiError | None = None
    models = _gemini_model_chain()

    for model in models:
        body = _build_request_body(
            prompt=prompt,
            image_base64=image_base64,
            mime_type=mime_type,
            model=model,
        )
        for attempt, delay in enumerate(_RETRY_DELAYS_SEC):
            try:
                try:
                    resp = await _post_generate_content(model, body)
                except httpx.HTTPError as exc:
                    raise GeminiError(f"Gemini network error: {exc}") from exc

                if resp.status_code in RETRYABLE_HTTP:
                    logger.warning(
                        "Gemini %s HTTP %s (attempt %s/%s)",
                        model,
                        resp.status_code,
                        attempt + 1,
                        len(_RETRY_DELAYS_SEC),
                    )
                    if attempt < len(_RETRY_DELAYS_SEC) - 1:
                        await asyncio.sleep(delay)
                        continue
                    raise GeminiError(f"Gemini HTTP {resp.status_code}")

                if resp.status_code >= 400:
                    logger.warning("Gemini %s error %s: %s", model, resp.status_code, resp.text[:300])
                    raise GeminiError(f"Gemini HTTP {resp.status_code}")

                result = _parse_generate_response(resp.json())
                if model != GEMINI_MODEL:
                    logger.info("Gemini succeeded via fallback model %s", model)
                return result
            except GeminiError as exc:
                last_error = exc
                retryable = str(exc).startswith("Gemini HTTP") and any(
                    f"HTTP {code}" in str(exc) for code in RETRYABLE_HTTP
                )
                if retryable and attempt < len(_RETRY_DELAYS_SEC) - 1:
                    await asyncio.sleep(delay)
                    continue
                break

    raise last_error or GeminiError("Gemini unavailable")
