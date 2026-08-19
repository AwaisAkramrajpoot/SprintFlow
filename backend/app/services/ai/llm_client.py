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
        logger.exception("LLM JSON invoke failed")
        _reraise_ai_error(exc, "AI request failed")


def _is_quota_error(exc: Exception) -> bool:
    message = str(exc).lower()
    return any(
        token in message
        for token in (
            "insufficient_quota",
            "credit_balance_exhausted",
            "no credits remaining",
            "exceeded your current quota",
        )
    )


def _reraise_ai_error(exc: Exception, prefix: str) -> None:
    from app.core.exceptions import AppException

    if isinstance(exc, AppException):
        raise exc

    status = getattr(exc, "status_code", None) or getattr(exc, "status", None)
    message = str(exc).lower()
    if _is_quota_error(exc):
        raise service_unavailable(
            "OpenAI credits are exhausted. Knowledge Base uses local embeddings "
            "and will still answer from your documents."
        ) from exc
    if status == 429 or "rate limit" in message:
        raise service_unavailable("AI rate limit reached. Try again in a moment.") from exc
    if status in {408, 504} or "timeout" in message or "timed out" in message:
        raise service_unavailable("AI request timed out. Try a shorter question.") from exc
    if status in {401, 403}:
        raise service_unavailable("AI provider rejected the API key.") from exc
    raise service_unavailable(f"{prefix}: {exc}") from exc


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
        _reraise_ai_error(exc, "AI request failed")


def get_embeddings():
    require_openai_key()
    try:
        from langchain_openai import OpenAIEmbeddings
    except ImportError as exc:
        raise service_unavailable(
            "LangChain OpenAI is not installed. Run: pip install langchain-openai"
        ) from exc

    return OpenAIEmbeddings(
        model=extended_settings.openai_embedding_model,
        openai_api_key=extended_settings.openai_api_key,
        dimensions=384,
        request_timeout=90,
        max_retries=0,
        chunk_size=100,
    )


_TOKEN_RE = re.compile(r"[a-z0-9]+", re.IGNORECASE)
_LOCAL_EMBED_DIM = 384


def _hash_embed_one(text: str) -> list[float]:
    import hashlib
    import math

    vec = [0.0] * _LOCAL_EMBED_DIM
    tokens = _TOKEN_RE.findall((text or "").lower())
    grams = tokens + [f"{a}_{b}" for a, b in zip(tokens, tokens[1:])]
    for token in grams:
        digest = hashlib.md5(token.encode("utf-8")).digest()
        index = int.from_bytes(digest[:4], "little") % _LOCAL_EMBED_DIM
        sign = 1.0 if digest[4] % 2 == 0 else -1.0
        vec[index] += sign
    norm = math.sqrt(sum(value * value for value in vec)) or 1.0
    return [value / norm for value in vec]


def _local_embed_texts(texts: list[str]) -> list[list[float]]:
    try:
        from fastembed import TextEmbedding
    except ImportError:
        logger.info("fastembed not installed; using local hashed embeddings")
        return [_hash_embed_one(text) for text in texts]

    model = getattr(_local_embed_texts, "_model", None)
    if model is None:
        model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
        _local_embed_texts._model = model  # type: ignore[attr-defined]
    vectors = []
    for item in model.embed(texts):
        vectors.append([float(value) for value in item])
    return vectors


def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    if extended_settings.embedding_provider != "openai":
        return _local_embed_texts(texts)
    try:
        return get_embeddings().embed_documents(texts)
    except Exception as exc:
        logger.warning("OpenAI embeddings failed (%s); using local embeddings", exc)
        return _local_embed_texts(texts)


def embed_query(text: str) -> list[float]:
    vectors = embed_texts([text])
    return vectors[0] if vectors else _hash_embed_one(text)
