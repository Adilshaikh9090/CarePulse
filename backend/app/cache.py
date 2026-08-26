import time
import functools
from typing import Any, Callable

_cache: dict[str, tuple[float, Any]] = {}
DEFAULT_TTL = 30


def cached(ttl: int = DEFAULT_TTL):
    def decorator(fn: Callable) -> Callable:
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            key = fn.__qualname__
            now = time.monotonic()
            if key in _cache:
                expires, val = _cache[key]
                if now < expires:
                    return val
            result = fn(*args, **kwargs)
            _cache[key] = (now + ttl, result)
            return result
        return wrapper
    return decorator


def invalidate():
    _cache.clear()
