"""ML engine accessors with lazy imports so importing this package never
pulls in sklearn/numpy/joblib (keeps app cold-start fast)."""

__all__ = ["WelfareRiskEngine", "get_engine", "features"]


def __getattr__(name):
    if name == "WelfareRiskEngine":
        from .engine import WelfareRiskEngine
        return WelfareRiskEngine
    if name == "get_engine":
        from .engine import get_engine
        return get_engine
    if name == "features":
        from . import features
        return features
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


def __dir__():
    return sorted(set(globals()) | set(__all__))