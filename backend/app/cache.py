import time

_store: dict[str, tuple[float, object]] = {}


def get_cache(key: str, ttl: int = 60) -> object | None:
    entry = _store.get(key)
    if entry and time.monotonic() < entry[0]:
        return entry[1]
    return None


def set_cache(key: str, value: object, ttl: int = 60) -> None:
    _store[key] = (time.monotonic() + ttl, value)


def invalidate():
    _store.clear()
