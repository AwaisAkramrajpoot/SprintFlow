"""Single LLM wrapper so providers can be swapped later."""

from __future__ import annotations

import json
import logging
import re

from app.core.exceptions import service_unavailable
from app.core.extended_settings import extended_settings

logger = logging.getLogger("taskflow.ai")

JSON_FENCE = re.compile(r"```(?:json)?\s*(.*?)\s*```", re.DOTALL)


def require_openai_key() -> str:
    key = (extended_settings.openai_api_key or "").strip()
    if not key:
        raise service_unavailable("OPENAI_API_KEY is not configured")
    return key


def get_llm(*, temperature: float = 0.2):
    require_openai_key()
    try:
        from langchain_openai import ChatOpenAI
    except ImportError as exc:
        raise service_unavailable(
            "LangChain OpenAI is not installed. Run: pip install langchain-openai"
        ) from exc

    return ChatOpenAI(
        model=extended_settings.openai_model,
        api_key=extended_settings.openai_api_key,
        temperature=temperature,
        timeout=90,
        max_retries=1,
    )


def _parse_json(raw: str) -> dict:
    text = (raw or "").strip()
    if not text:
        raise service_unavailable("Empty response from the language model")
    match = JSON_FENCE.search(text)
    if match:
        text = match.group(1)
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            data = json.loads(text[start : end + 1])
        else:
            raise service_unavailable("The language model did not return valid JSON")
    if not isinstance(data, dict):
        return {"data": data}
    return data


def invoke_json(system_prompt: str, user_prompt: str, *, temperature: float = 0.2) -> dict:
    try:
        from langchain_core.messages import HumanMessage, SystemMessage

        llm = get_llm(temperature=temperature).bind(
            response_format={"type": "json_object"}
        )
        result = llm.invoke(
            [SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)]
        )
        return _parse_json(getattr(result, "content", "") or "")
    except Exception as exc:
        if hasattr(exc, "status_code") and getattr(exc, "status_code") in {400, 401, 403, 429}:
            raise service_unavailable(str(exc)) from exc
        logger.exception("LLM JSON invoke failed")
        from app.core.exceptions import AppException

        if isinstance(exc, AppException):
            raise
        raise service_unavailable(f"AI request failed: {exc}") from exc


def invoke_text(system_prompt: str, user_prompt: str, *, temperature: float = 0.3) -> str:
    try:
        from langchain_core.messages import HumanMessage, SystemMessage

        llm = get_llm(temperature=temperature)
        result = llm.invoke(
            [SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)]
        )
        return (getattr(result, "content", "") or "").strip()
    except Exception as exc:
        logger.exception("LLM text invoke failed")
        from app.core.exceptions import AppException

        if isinstance(exc, AppException):
            raise
        raise service_unavailable(f"AI request failed: {exc}") from exc
