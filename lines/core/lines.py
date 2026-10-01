"""The line through a point (x₁, y₁) with slope m, in all three forms, built on formula.py.

formula.py holds the mathematics as written: the three forms and the
conversions between them. This module calls those and adds what the page
needs around them: float tidying, whole-number standard form, the forms as
text, a table showing all three forms give the same y, and a plot window.
The JavaScript mirror (html/static/lines_math.js) is kept identical by
tests/test_js_parity.py.
"""

from __future__ import annotations

import math
from dataclasses import asdict, dataclass
from fractions import Fraction

from general.plotting import Viewport, fit_viewport

from . import formula

TABLE_XS = (-2, -1, 0, 1, 2)


def _clean(value: float) -> float:
    """Round away float noise (e.g. 1.9999999999 -> 2.0, -0.0 -> 0.0)."""
    rounded = round(value, 10)
    return 0.0 if rounded == 0 else rounded


def fmt(value: float) -> str:
    """Compact human-readable number: 2.0 -> '2', 0.3333333 -> '0.3333'."""
    return f"{_clean(value):.4g}"


def _signed(value: float, symbol: str = "") -> str:
    """A term with an explicit sign, e.g. ' - 3x' or ' + 2'."""
    return f" {'-' if value < 0 else '+'} {fmt(abs(value))}{symbol}"


def _coef(value: float) -> str:
    """A coefficient without a redundant 1: 1 -> '', -1 -> '-', 2 -> '2'."""
    return {1: "", -1: "-"}.get(_clean(value), fmt(value))


def standard_whole_numbers(m: float, b: float) -> tuple[int, int, int]:
    """formula.standard_coefficients on the exact values of m and b, scaled to whole numbers with A ≥ 0."""
    A, B, C = (Fraction(v) for v in formula.standard_coefficients(Fraction(str(m)), Fraction(str(b))))
    scale = math.lcm(A.denominator, B.denominator, C.denominator)
    A, B, C = (int(v * scale) for v in (A, B, C))
    divisor = math.gcd(A, B, C) or 1
    A, B, C = A // divisor, B // divisor, C // divisor
    if A < 0 or (A == 0 and B < 0):
        A, B, C = -A, -B, -C
    return A, B, C


def slope_intercept_text(m: float, b: float) -> str:
    """'y = mx + b' with zero terms dropped and signs tidied."""
    if m == 0:
        return f"y = {fmt(b)}"
    return f"y = {_coef(m)}x" + (_signed(b) if b else "")


def point_slope_text(x1: float, y1: float, m: float) -> str:
    """'y − y₁ = m(x − x₁)' with the point filled in."""
    left = "y" if y1 == 0 else f"y{_signed(-y1)}"
    if m == 0:
        return f"{left} = 0"
    return f"{left} = {_coef(m)}" + ("x" if x1 == 0 else f"(x{_signed(-x1)})")


def standard_text(A: int, B: int, C: int) -> str:
    """'Ax + By = C' with whole numbers."""
    terms = []
    if A:
        terms.append(f"{'' if A == 1 else '-' if A == -1 else A}x")
    if B:
        k = "" if abs(B) == 1 else str(abs(B))
        terms.append(f"{'-' if B < 0 else '+'} {k}y" if terms else f"{'-' if B < 0 else ''}{k}y")
    return f"{' '.join(terms)} = {C}"


def table(x1: float, y1: float, m: float, b: float, A: int, B: int, C: int) -> list[dict]:
    """y at a few x from each form: the three columns agree because they are the same line."""
    return [
        {
            "x": x,
            "slope_intercept": _clean(formula.linear_form(m, b, x)),
            "point_slope": _clean(formula.point_form_slope(x1, y1, m, x)),
            "standard": _clean(formula.standard_form_for_linear_form(A, B, C, x)),
        }
        for x in TABLE_XS
    ]


def plot_window(x1: float, y1: float, m: float, b: float, xi: float | None) -> Viewport:
    """A viewport that frames the point, the origin and the line's intercepts."""
    xs = [x1, 0.0] + ([xi] if xi is not None and abs(xi) <= 50 else [])
    ys = [y1, 0.0] + ([b] if abs(b) <= 50 else [])
    return fit_viewport(xs, lambda x: formula.linear_form(m, b, x), always_include_y=ys, padding=0.2)


@dataclass(frozen=True)
class LineSolution:
    """Everything the page needs, computed once."""

    x1: float
    y1: float
    m: float
    b: float
    x_intercept: float | None
    standard: dict
    slope_intercept_form: str
    point_slope_form: str
    standard_form: str
    table: list
    window: Viewport

    def to_dict(self) -> dict:
        data = asdict(self)
        data["window"] = self.window.to_dict()
        return data


def solve(x1: float, y1: float, m: float) -> LineSolution:
    """Write the line through (x₁, y₁) with slope m in all three forms."""
    b = _clean(formula.y_intercept(x1, y1, m))
    xi = None if m == 0 else _clean(formula.x_intercept(m, formula.y_intercept(x1, y1, m)))
    A, B, C = standard_whole_numbers(m, b)
    return LineSolution(
        x1=x1,
        y1=y1,
        m=m,
        b=b,
        x_intercept=xi,
        standard={"A": A, "B": B, "C": C},
        slope_intercept_form=slope_intercept_text(m, b),
        point_slope_form=point_slope_text(x1, y1, m),
        standard_form=standard_text(A, B, C),
        table=table(x1, y1, m, b, A, B, C),
        window=plot_window(x1, y1, m, b, xi),
    )
