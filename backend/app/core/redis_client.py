import logging

from app.core.config import settings

logger = logging.getLogger("taskflow.redis")

_client = None
_attempted = False


def get_redis():
    """Return a Redis client when available; otherwise None."""
    global _client, _attempted
    if _attempted:
        return _client

    _attempted = True
    try:
        import redis

        client = redis.from_url(settings.redis_url, decode_responses=True)
        client.ping()
        _client = client
        logger.info("Redis connected")
    except Exception as exc:  # noqa: BLE001
        logger.warning("Redis unavailable, using DB-only token revoke: %s", exc)
        _client = None
    return _client
