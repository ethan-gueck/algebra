"""The line through two points (x₁, y₁) and (x₂, y₂), built on formula.py.

formula.py holds the mathematics as written: rise, run, m = Δy / Δx, both
intercepts, the angle and the line's three forms. This module calls those and
adds what the page needs around them: input checks, the vertical and
horizontal cases, float tidying, the forms as text and a plot window. The JavaScript mirror (html/static/slope_math.js) is kept identical by
tests/test_js_parity.py.
"""

from __future__ import annotations

import math
from dataclasses import asdict, dataclass
from fractions import Fraction

from general.plotting import Viewport, fit_viewport

from . import formula


def _is_zero(value: float, *scale: float) -> bool:
    """Tolerance-aware zero check, relative to the magnitude of the inputs."""
    return abs(value) <= 1e-12 * max(1.0, *(abs(s) for s in scale))


def _clean(value: float) -> float:
    """Round away float noise (e.g. 1.9999999999 -> 2.0, -0.0 -> 0.0)."""
    rounded = round(value, 10)
    return 0.0 if rounded == 0 else rounded


def fmt(value: float) -> str:
    """Compact human-readable number: 2.0 -> '2', 0.3333333 -> '0.3333'."""
    return f"{_clean(value):.4g}"


def _validate(x1: float, y1: float, x2: float, y2: float) -> None:
    if x1 == x2 and y1 == y2:
        raise ValueError("The two points are the same; a line needs two different points.")


def rise(x1: float, y1: float, x2: float, y2: float) -> float:
    """Δy = y₂ − y₁ (formula.rise): how far the line goes up (or down, if negative)."""
    return _clean(formula.rise(y1, y2))


def run(x1: float, y1: float, x2: float, y2: float) -> float:
    """Δx = x₂ − x₁ (formula.run): how far the line goes across."""
    return _clean(formula.run(x1, x2))


def slope(x1: float, y1: float, x2: float, y2: float) -> float | None:
    """m = Δy / Δx (formula.slope), or ``None`` for a vertical line (Δx = 0, slope undefined)."""
    _validate(x1, y1, x2, y2)
    if _is_zero(formula.run(x1, x2), x1, x2):
        return None
    return _clean(formula.slope(x1, y1, x2, y2))


def classify(m: float | None) -> str:
    """'positive' (rises left to right), 'negative' (falls), 'zero' (horizontal) or 'undefined' (vertical)."""
    if m is None:
        return "undefined"
    if m == 0:
        return "zero"
    return "positive" if m > 0 else "negative"


def y_intercept(x1: float, y1: float, x2: float, y2: float) -> float | None:
    """b in y = mx + b (formula.y_intercept): where the line crosses x = 0. ``None`` for a vertical line.

    Uses the unrounded slope, so rounding in the displayed m doesn't leak into b.
    """
    if slope(x1, y1, x2, y2) is None:
        return None
    return _clean(formula.y_intercept(formula.slope(x1, y1, x2, y2), x1, y1))


def x_intercept(x1: float, y1: float, x2: float, y2: float) -> float | None:
    """Where the line crosses y = 0 (formula.x_intercept).

    A vertical line crosses at x₁. A horizontal line never crosses, or lies on
    the x-axis itself (every x is an intercept); both return ``None``.
    """
    m = slope(x1, y1, x2, y2)
    if m is None:
        return _clean(x1)
    if m == 0:
        return None
    return _clean(formula.x_intercept(formula.slope(x1, y1, x2, y2), x1, y1))


def angle_of_inclination(x1: float, y1: float, x2: float, y2: float) -> float:
    """Angle the line makes with the positive x-axis, in degrees, from −90° to 90° (90° when vertical)."""
    if slope(x1, y1, x2, y2) is None:
        return 90.0
    return _clean(formula.angle_of_inclination(formula.slope(x1, y1, x2, y2)))


def _signed(value: float, symbol: str = "") -> str:
    """Format a term with an explicit sign, e.g. ' - 3x' or ' + 2'."""
    sign = "-" if value < 0 else "+"
    return f" {sign} {fmt(abs(value))}{symbol}"


def _coef(value: float) -> str:
    """Coefficient without a redundant 1: 1 -> '', -1 -> '-', 2 -> '2'."""
    return {1: "", -1: "-"}.get(_clean(value), fmt(value))


def slope_intercept_form(m: float | None, b: float | None, x1: float = 0.0) -> str:
    """'y = mx + b', or 'x = x₁' for a vertical line."""
    if m is None:
        return f"x = {fmt(x1)}"
    if m == 0:
        return f"y = {fmt(b)}"
    return f"y = {_coef(m)}x" + (_signed(b) if b else "")


def point_slope_form(x1: float, y1: float, m: float | None) -> str:
    """'y − y₁ = m(x − x₁)' with the first point filled in, or 'x = x₁' for a vertical line."""
    if m is None:
        return f"x = {fmt(x1)}"
    left = "y" if y1 == 0 else f"y{_signed(-y1)}"
    if m == 0:
        return f"{left} = 0"
    shifted = "x" if x1 == 0 else f"(x{_signed(-x1)})"
    return f"{left} = {_coef(m)}{shifted}"


def standard_form(x1: float, y1: float, x2: float, y2: float) -> str:
    """'Ax + By = C' with A ≥ 0, scaled to whole numbers when the points allow it.

    formula.standard_form on the points' exact values, then scaled to whole numbers.
    """
    _validate(x1, y1, x2, y2)
    fa, fb, fc = formula.standard_form(*(Fraction(str(v)) for v in (x1, y1, x2, y2)))
    scale = math.lcm(fa.denominator, fb.denominator, fc.denominator)
    a, b, c = (int(v * scale) for v in (fa, fb, fc))
    divisor = math.gcd(a, b, c) or 1
    a, b, c = a // divisor, b // divisor, c // divisor
    if a < 0 or (a == 0 and b < 0):
        a, b, c = -a, -b, -c
    terms = []
    if a:
        terms.append(f"{'' if a == 1 else '-' if a == -1 else a}x")
    if b:
        coef = "" if abs(b) == 1 else str(abs(b))
        terms.append(f"{'-' if b < 0 else '+'} {coef}y" if terms else f"{'-' if b < 0 else ''}{coef}y")
    return f"{' '.join(terms)} = {c}"


def plot_window(x1: float, y1: float, x2: float, y2: float) -> Viewport:
    """A viewport that frames both points, the origin and the line's intercepts."""
    m = slope(x1, y1, x2, y2)
    b = y_intercept(x1, y1, x2, y2)
    xi = x_intercept(x1, y1, x2, y2)
    xs = [x1, x2, 0.0] + ([xi] if xi is not None and abs(xi) <= 50 else [])
    f = (lambda x: y1) if m is None else (lambda x: m * x + b)
    ys = [y1, y2, 0.0] + ([b] if b is not None and abs(b) <= 50 else [])
    return fit_viewport(xs, f, always_include_y=ys, padding=0.2)


@dataclass(frozen=True)
class SlopeSolution:
    """Everything the page needs, computed once."""

    x1: float
    y1: float
    x2: float
    y2: float
    rise: float
    run: float
    slope: float | None
    kind: str
    angle: float
    y_intercept: float | None
    x_intercept: float | None
    slope_intercept_form: str
    point_slope_form: str
    standard_form: str
    window: Viewport

    def to_dict(self) -> dict:
        data = asdict(self)
        data["window"] = self.window.to_dict()
        return data


def solve(x1: float, y1: float, x2: float, y2: float) -> SlopeSolution:
    """Run every calculation for the line through (x₁, y₁) and (x₂, y₂)."""
    m = slope(x1, y1, x2, y2)
    b = y_intercept(x1, y1, x2, y2)
    return SlopeSolution(
        x1=x1,
        y1=y1,
        x2=x2,
        y2=y2,
        rise=rise(x1, y1, x2, y2),
        run=run(x1, y1, x2, y2),
        slope=m,
        kind=classify(m),
        angle=angle_of_inclination(x1, y1, x2, y2),
        y_intercept=b,
        x_intercept=x_intercept(x1, y1, x2, y2),
        slope_intercept_form=slope_intercept_form(m, b, x1),
        point_slope_form=point_slope_form(x1, y1, m),
        standard_form=standard_form(x1, y1, x2, y2),
        window=plot_window(x1, y1, x2, y2),
    )
