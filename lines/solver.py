"""The line through a point (x₁, y₁) with slope m, in all three forms, and the inequalities it bounds.

core/formula.py holds the mathematics as written: A1.5 Equations of a Line
(the three forms and the conversions between them) and A1.15 Linear
Inequalities (adding to both sides keeps the sign; multiplying by a negative
flips it). This module calls those and adds what the page needs around them:
float tidying, whole-number standard form, the forms as text, a table showing
all three forms give the same y, a plot window, and for y < mx + b (or >, ≤,
≥) which side of the line is shaded, a test point and the steps through
standard form where the sign can flip.
The JavaScript mirror (html/static/lines_math.js) is kept identical by
tests/test_js_parity.py.
"""

from __future__ import annotations

import math
from dataclasses import asdict, dataclass
from fractions import Fraction

from general.plotting import Viewport, fit_viewport

from core import formula

TABLE_XS = (-2, -1, 0, 1, 2)
RELATIONS = ("=", "<", "≤", ">", "≥")
FLIP = {"=": "=", "<": ">", "≤": "≥", ">": "<", "≥": "≤"}  # multiplying or dividing by a negative


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
            "slope_intercept": _clean(formula.linear_form(b, x, m=m)),
            "point_slope": _clean(formula.point_form_slope(x1, y1, m, x)),
            "standard": _clean(formula.standard_form_for_linear_form(A, B, C, x)),
        }
        for x in TABLE_XS
    ]


def plot_window(x1: float, y1: float, m: float, b: float, xi: float | None) -> Viewport:
    """A viewport that frames the point, the origin and the line's intercepts."""
    xs = [x1, 0.0] + ([xi] if xi is not None and abs(xi) <= 50 else [])
    ys = [y1, 0.0] + ([b] if abs(b) <= 50 else [])
    return fit_viewport(xs, lambda x: formula.linear_form(b, x, m=m), always_include_y=ys, padding=0.2)


# ---- Linear inequalities: y < mx + b and its relatives ----------------------


def holds(left: float, relation: str, right: float) -> bool:
    """left relation right, e.g. holds(0, '<', 1) is True."""
    return {"=": left == right, "<": left < right, "≤": left <= right, ">": left > right, "≥": left >= right}[relation]


def _with(text: str, relation: str) -> str:
    """An equation's text with its '=' replaced by the relation: 'y = 2x + 1' -> 'y > 2x + 1'."""
    return text.replace(" = ", f" {relation} ", 1)


def inequality(m: float, b: float, A: int, B: int, C: int, relation: str, slope_intercept: str, standard: str) -> dict:
    """y relation mx + b: its standard form, the shaded side, a test point and the steps between the forms."""
    # Standard form is −mx + y relation b scaled by B (B = k·1): a negative B flips the sign.
    standard_relation = relation if B > 0 else FLIP[relation]
    # Test a point off the line: the origin, or (0, 1) when the line passes through it.
    x0, y0 = (0.0, 1.0) if b == 0 else (0.0, 0.0)
    right = _clean(formula.linear_form(b, x0, m=m))
    inside = holds(y0, relation, right)
    left = _clean(A * x0 + B * y0)
    dashed = relation in ("<", ">")
    sign = "flips" if B < 0 else "stays"
    by = {1: "y", -1: "-y"}.get(B, f"{B}y")
    rest = str(C) if A == 0 else f"{C} − {'' if A == 1 else A}x"
    scale = "" if B == 1 else f", then multiply by {B} for whole numbers" + (" (a negative, so the sign flips)" if B < 0 else "")
    steps = [
        {"id": "inequality", "title": "Write the inequality", "math": f"y {relation} mx + b  →  {_with(slope_intercept, relation)}"},
        {"id": "inequality", "title": "Move x across: standard form", "math": f"subtract mx from both sides (the sign stays){scale}  →  {_with(standard, standard_relation)}"},
        {"id": "inequality", "title": "Back to y: divide by B", "math": f"{by} {standard_relation} {rest}, and dividing by B = {B} the sign {sign}  →  {_with(slope_intercept, relation)}"},
        {"id": "inequality", "title": "Check the rules with these numbers", "math": f"linear_inequality(a = {fmt(left)}, b = {C}, c = 1/B = {fmt(1 / B)}) = {formula.linear_inequality(left, C, 1 / B)}: adding keeps the sign, multiplying by {'a negative flips' if B < 0 else 'a positive keeps'} it"},
        {"id": "shade", "title": "Test a point off the line", "math": f"({fmt(x0)}, {fmt(y0)}): {fmt(y0)} {relation} {fmt(right)} is {'true' if inside else 'false'}, so the solutions are the side {'with' if inside else 'without'} this point: {'above' if relation in ('>', '≥') else 'below'} the line"},
        {"id": "shade", "title": "Draw the boundary", "math": "< and > leave the line out: dashed" if dashed else "≤ and ≥ include the line: solid"},
    ]
    return {
        "relation": relation,
        "slope_intercept_form": _with(slope_intercept, relation),
        "standard_relation": standard_relation,
        "standard_form": _with(standard, standard_relation),
        "shade": "above" if relation in (">", "≥") else "below",
        "dashed": dashed,
        "test_point": [x0, y0],
        "test_holds": inside,
        "steps": steps,
    }


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
    inequality: dict | None

    def to_dict(self) -> dict:
        data = asdict(self)
        data["window"] = self.window.to_dict()
        return data


def solve(x1: float, y1: float, m: float, relation: str = "=") -> LineSolution:
    """Write the line through (x₁, y₁) with slope m in all three forms; with a relation other than '=', the inequality y relation mx + b too."""
    if relation not in RELATIONS:
        raise ValueError(f"relation must be one of {', '.join(RELATIONS)}")
    b = _clean(formula.y_intercept(m, x1, y1))
    xi = None if m == 0 else _clean(formula.x_intercept_of_linear_form(m, formula.y_intercept(m, x1, y1)))
    A, B, C = standard_whole_numbers(m, b)
    slope_intercept, standard = slope_intercept_text(m, b), standard_text(A, B, C)
    return LineSolution(
        x1=x1,
        y1=y1,
        m=m,
        b=b,
        x_intercept=xi,
        standard={"A": A, "B": B, "C": C},
        slope_intercept_form=slope_intercept,
        point_slope_form=point_slope_text(x1, y1, m),
        standard_form=standard,
        table=table(x1, y1, m, b, A, B, C),
        window=plot_window(x1, y1, m, b, xi),
        inequality=None if relation == "=" else inequality(m, b, A, B, C, relation, slope_intercept, standard),
    )
