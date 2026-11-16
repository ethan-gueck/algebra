"""A function f(x) = a·g(x − h) + k from one of six families: its domain, range, f(x₀) and the vertical line test.

core/formula.py holds the mathematics as written: A1.9 function_notation(), the three domain
restrictions (denominator_allowed, even_root_allowed, log_allowed) and vertical_line_test().
This module calls those and adds what the page needs around them: each family's rule, the
domain and range as intervals and in interval notation, the outputs at x₀, and a plot window.
The sideways parabola x = a(y − k)² + h is a relation, not a function: it fails the test.
The JavaScript mirror (html/static/functions_math.js) is kept identical by tests/test_js_parity.py.
"""

from __future__ import annotations

import math
from dataclasses import asdict, dataclass

from general.plotting import Viewport, nice_step

from core import formula

FAMILIES = ("linear", "quadratic", "reciprocal", "sqrt", "log", "sideways")


def _clean(value: float) -> float:
    """Round away float noise (e.g. 1.9999999999 -> 2.0, -0.0 -> 0.0)."""
    rounded = round(value, 10)
    return 0.0 if rounded == 0 else rounded


def fmt(value: float) -> str:
    """Compact human-readable number with a true minus sign: -2.0 -> '−2', 0.3333333 -> '0.3333'."""
    return f"{_clean(value):.4g}".replace("-", "−")


def rule(family: str, a: float, h: float, k: float):
    """The rule f as a Python function of x (the sideways parabola has none: it is not a function)."""
    return {
        "linear": lambda x: a * (x - h) + k,
        "quadratic": lambda x: a * (x - h) ** 2 + k,
        "reciprocal": lambda x: a / (x - h) + k,
        "sqrt": lambda x: a * math.sqrt(x - h) + k,
        "log": lambda x: a * math.log(x - h) + k,
    }.get(family)


def allowed(family: str, a: float, h: float, x: float) -> bool:
    """Is x in the domain? Each family has at most one restriction, on g = x − h."""
    g = x - h
    if family == "reciprocal":
        return formula.denominator_allowed(g)
    if family == "sqrt":
        return formula.even_root_allowed(g)
    if family == "log":
        return formula.log_allowed(g)
    if family == "sideways":
        return formula.even_root_allowed(g / a)  # y = k ± √((x − h) / a)
    return True


def outputs(family: str, a: float, h: float, k: float, x: float) -> list[float]:
    """Every y paired with x: none outside the domain, one for a function, two for the sideways parabola."""
    if not allowed(family, a, h, x):
        return []
    if family == "sideways":
        r = math.sqrt((x - h) / a)
        return [_clean(k)] if r == 0 else [_clean(k + r), _clean(k - r)]
    return [_clean(formula.function_notation(rule(family, a, h, k), x))]


# An interval is [lo, hi, lo_closed, hi_closed]; None for lo or hi means −∞ or ∞.
ALL = [[None, None, False, False]]


def _ray(at: float, up: bool) -> list:
    """[at, ∞) when up, (−∞, at] otherwise."""
    return [[at, None, True, False]] if up else [[None, at, False, True]]


def _without(at: float) -> list:
    """(−∞, at) ∪ (at, ∞)"""
    return [[None, at, False, False], [at, None, False, False]]


def domain(family: str, a: float, h: float) -> list:
    """The allowed inputs: all reals minus whatever breaks a denominator, an even root or a log."""
    return {
        "reciprocal": _without(h),
        "sqrt": _ray(h, True),
        "log": [[h, None, False, False]],
        "sideways": _ray(h, a > 0),
    }.get(family, ALL)


def range_(family: str, a: float, k: float) -> list:
    """The outputs actually produced."""
    return {
        "quadratic": _ray(k, a > 0),
        "sqrt": _ray(k, a > 0),
        "reciprocal": _without(k),
    }.get(family, ALL)


def interval_text(intervals: list) -> str:
    """Interval notation: [[2, None, True, False]] -> '[2, ∞)'; pieces joined by ∪."""
    def one(lo, hi, lo_closed, hi_closed):
        left = "(−∞" if lo is None else ("[" if lo_closed else "(") + fmt(lo)
        right = "∞)" if hi is None else fmt(hi) + ("]" if hi_closed else ")")
        return f"{left}, {right}"
    return " ∪ ".join(one(*i) for i in intervals)


def _shift(var: str, c: float) -> str:
    """'x − 2', 'x + 2' or 'x'."""
    return var if c == 0 else f"{var} {'−' if c > 0 else '+'} {fmt(abs(c))}"


def _coef(a: float) -> str:
    return {1: "", -1: "−"}.get(a, fmt(a))


def _tail(c: float) -> str:
    return "" if c == 0 else f" {'+' if c > 0 else '−'} {fmt(abs(c))}"


def equation(family: str, a: float, h: float, k: float) -> str:
    """The rule as text, e.g. 'f(x) = 2√(x − 1) + 3' or 'x = (y − 1)² − 2'."""
    inner = _shift("x", h)
    wrapped = inner if h == 0 else f"({inner})"
    body = {
        "linear": inner if a == 1 else f"{_coef(a)}{wrapped}",
        "quadratic": f"{_coef(a)}{wrapped}²",
        "reciprocal": f"{fmt(a)} / {wrapped}",
        "sqrt": f"{_coef(a)}√{wrapped}",
        "log": f"{_coef(a)}{'' if abs(a) == 1 else ' '}ln{' x' if h == 0 else wrapped}",
    }
    if family == "sideways":
        y = _shift("y", k)
        return f"x = {_coef(a)}{y if k == 0 else f'({y})'}²{_tail(h)}"
    return f"f(x) = {body[family]}{_tail(k)}"


def _snap_outward(lo: float, hi: float, step: float) -> tuple[float, float]:
    return math.floor(lo / step) * step, math.ceil(hi / step) * step


def plot_window(points: list[list[float]]) -> Viewport:
    """A square-ish viewport around the key points and the origin, at least 8 units wide."""
    xs, ys = [p[0] for p in points] + [0.0], [p[1] for p in points] + [0.0]
    lo_x, hi_x, lo_y, hi_y = min(xs), max(xs), min(ys), max(ys)
    span = max(hi_x - lo_x, hi_y - lo_y, 8.0) * 1.3
    cx, cy = (lo_x + hi_x) / 2, (lo_y + hi_y) / 2
    step = nice_step(span)
    x_min, x_max = _snap_outward(cx - span / 2, cx + span / 2, step)
    y_min, y_max = _snap_outward(cy - span / 2, cy + span / 2, step)
    return Viewport(x_min, x_max, y_min, y_max, step, step)


@dataclass(frozen=True)
class FunctionSolution:
    """Everything the page needs, computed once."""

    family: str
    a: float
    h: float
    k: float
    x0: float
    equation: str
    domain: list
    range: list
    domain_text: str
    range_text: str
    in_domain: bool
    hits: list
    value: float | None
    is_function: bool
    vertical_asymptote: float | None
    horizontal_asymptote: float | None
    endpoint: list | None
    window: Viewport

    def to_dict(self) -> dict:
        data = asdict(self)
        data["window"] = self.window.to_dict()
        return data


def solve(a: float, h: float, k: float, x0: float, family: str = "reciprocal") -> FunctionSolution:
    """f(x) = a·g(x − h) + k for the chosen family: domain, range, f(x₀) and the vertical line test."""
    if family not in FAMILIES:
        raise ValueError(f"Unknown family {family!r}: choose one of {', '.join(FAMILIES)}.")
    if a == 0:
        raise ValueError("a must not be 0: that flattens every family to the constant k.")
    hits = outputs(family, a, h, k, x0)
    key = [[h, k]] + [[x0, y] for y in hits if abs(x0) <= 50 and abs(y) <= 50]
    window = plot_window(key)
    # The vertical line test across the window: every (x, y) on the graph at 41 evenly spaced x.
    xs = [window.x_min + (window.x_max - window.x_min) * i / 40 for i in range(41)]
    pairs = [(x, y) for x in xs for y in outputs(family, a, h, k, x)]
    return FunctionSolution(
        family=family, a=a, h=h, k=k, x0=x0, equation=equation(family, a, h, k),
        domain=domain(family, a, h), range=range_(family, a, k),
        domain_text=interval_text(domain(family, a, h)), range_text=interval_text(range_(family, a, k)),
        in_domain=allowed(family, a, h, x0), hits=hits,
        value=hits[0] if hits and family != "sideways" else None,
        is_function=formula.vertical_line_test(pairs),
        vertical_asymptote=h if family in ("reciprocal", "log") else None,
        horizontal_asymptote=k if family == "reciprocal" else None,
        endpoint=[h, k] if family in ("sqrt", "sideways") else None,
        window=window,
    )
