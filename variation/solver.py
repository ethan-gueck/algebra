"""Direct and inverse variation through one known point, and the y it predicts at a new x.

core/formula.py holds the mathematics as written: A1.13 Direct & Inverse
Variation (y = kx and y = k / x). This module calls those and adds what the
page needs around them: k from the known point (x₁, y₁), the y it predicts at
x₂, the quantity that stays equal to k (y / x or xy), how scaling x scales y,
a table, the equation as text and a plot window that keeps the hyperbola's
branches in view.
The JavaScript mirror (html/static/variation_math.js) is kept identical by
tests/test_js_parity.py.
"""

from __future__ import annotations

import math
from dataclasses import asdict, dataclass

from general.plotting import Viewport, nice_step

from core import formula

KINDS = ("direct", "inverse")
TABLE_XS = (-2, -1, 1, 2, 4)


def _clean(value: float) -> float:
    """Round away float noise (e.g. 1.9999999999 -> 2.0, -0.0 -> 0.0)."""
    rounded = round(value, 10)
    return 0.0 if rounded == 0 else rounded


def fmt(value: float) -> str:
    """Compact human-readable number: 2.0 -> '2', 0.3333333 -> '0.3333'."""
    return f"{_clean(value):.4g}"


def constant(kind: str, x1: float, y1: float) -> float:
    """k from the known point: y = kx gives k = y₁ / x₁; y = k / x gives k = x₁·y₁."""
    return y1 / x1 if kind == "direct" else x1 * y1


def predict(kind: str, k: float, x: float) -> float:
    """y at x: formula.direct_variation (y = kx) or formula.indirect_variation (y = k / x)."""
    return formula.direct_variation(k, x) if kind == "direct" else formula.indirect_variation(k, x)


def invariant(kind: str, x: float, y: float) -> float:
    """The quantity every point shares: y / x for direct variation, xy for inverse; both equal k."""
    return y / x if kind == "direct" else x * y


def equation_text(kind: str, k: float) -> str:
    """'y = 3x' or 'y = 12 / x', with k = 1 and k = −1 tidied."""
    if kind == "direct":
        return f"y = {({1: '', -1: '-'}).get(_clean(k), fmt(k))}x"
    return f"y = {fmt(k)} / x"


def table(kind: str, k: float) -> list[dict]:
    """y at a few x, and y / x or xy beside it: the last column is k on every row."""
    rows = []
    for x in TABLE_XS:
        y = predict(kind, k, x)
        rows.append({"x": x, "y": _clean(y), "invariant": _clean(invariant(kind, x, y))})
    return rows


def _snap_outward(lo: float, hi: float, step: float) -> tuple[float, float]:
    return math.floor(lo / step) * step, math.ceil(hi / step) * step


def plot_window(kind: str, k: float, x1: float, y1: float, x2: float, y2: float) -> Viewport:
    """A viewport that frames the origin and both points; for y = k / x it ignores the branches' climb toward x = 0."""
    lo, hi = min(0.0, x1, x2), max(0.0, x1, x2)
    span = max(hi - lo, 4.0)
    mid = (lo + hi) / 2
    x_step = nice_step(span * 1.4)
    x_min, x_max = _snap_outward(mid - span * 0.7, mid + span * 0.7, x_step)
    ys = [0.0, y1, y2, predict(kind, k, x_min), predict(kind, k, x_max)]
    y_lo, y_hi = min(ys), max(ys)
    if y_hi - y_lo < 4.0:
        centre = (y_lo + y_hi) / 2
        y_lo, y_hi = centre - 2.0, centre + 2.0
    pad = (y_hi - y_lo) * 0.08
    y_step = nice_step(y_hi - y_lo + 2 * pad)
    y_min, y_max = _snap_outward(y_lo - pad, y_hi + pad, y_step)
    return Viewport(x_min, x_max, y_min, y_max, x_step, y_step)


@dataclass(frozen=True)
class VariationSolution:
    """Everything the page needs, computed once."""

    kind: str
    x1: float
    y1: float
    x2: float
    k: float
    y2: float
    x_scale: float
    y_scale: float
    equation: str
    table: list
    window: Viewport

    def to_dict(self) -> dict:
        data = asdict(self)
        data["window"] = self.window.to_dict()
        return data


def solve(x1: float, y1: float, x2: float, kind: str = "direct") -> VariationSolution:
    """Find k from the known point (x₁, y₁), then y₂ at x₂, for y = kx (direct) or y = k / x (inverse)."""
    if kind not in KINDS:
        raise ValueError(f"kind must be one of {', '.join(KINDS)}")
    if x1 == 0:
        raise ValueError("The known point needs x₁ ≠ 0: y = kx gives k = y₁ / x₁, and y = k / x is undefined at x = 0.")
    if y1 == 0:
        raise ValueError("The known point needs y₁ ≠ 0, or k = 0 and y is 0 everywhere: that is not a variation.")
    if kind == "inverse" and x2 == 0:
        raise ValueError("y = k / x is undefined at x = 0: pick x₂ ≠ 0.")
    k = _clean(constant(kind, x1, y1))
    y2 = _clean(predict(kind, k, x2))
    x_scale = _clean(x2 / x1)
    return VariationSolution(
        kind=kind,
        x1=x1,
        y1=y1,
        x2=x2,
        k=k,
        y2=y2,
        x_scale=x_scale,
        y_scale=_clean(y2 / y1),
        equation=equation_text(kind, k),
        table=table(kind, k),
        window=plot_window(kind, k, x1, y1, x2, y2),
    )
