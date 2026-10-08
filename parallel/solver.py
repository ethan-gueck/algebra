"""Two lines, each through two points: their slopes, and whether they are parallel or perpendicular.

core/formula.py holds the mathematics as written: A1.4 slope() and A1.6 is_parallel() and
is_perpendicular(), which take the two points of each line and handle a vertical line
(undefined slope). This module calls those and adds what the page needs around them: each
line's equation as text, the product m₁ · m₂, the angle between the lines, where they cross,
and a plot window.
The JavaScript mirror (html/static/parallel_math.js) is kept identical by tests/test_js_parity.py.
"""

from __future__ import annotations

import math
from dataclasses import asdict, dataclass

from general.plotting import Viewport, nice_step

from core import formula


def _clean(value: float) -> float:
    """Round away float noise (e.g. 1.9999999999 -> 2.0, -0.0 -> 0.0)."""
    rounded = round(value, 10)
    return 0.0 if rounded == 0 else rounded


def fmt(value: float) -> str:
    """Compact human-readable number: 2.0 -> '2', 0.3333333 -> '0.3333'."""
    return f"{_clean(value):.4g}"


def line(xa: float, ya: float, xb: float, yb: float) -> dict:
    """One line through (xa, ya) and (xb, yb): slope, intercept and equation (vertical: slope None)."""
    if (xa, ya) == (xb, yb):
        raise ValueError("A line needs two different points.")
    if formula.run(xa, xb) == 0:
        return {"m": None, "b": None, "vertical_x": _clean(xa), "equation": f"x = {fmt(xa)}", "angle": 90.0}
    m = _clean(formula.slope(xa, ya, xb, yb))
    b = _clean(formula.y_intercept(m, xa, ya))
    if m == 0:
        text = f"y = {fmt(b)}"
    else:
        coef = {1: "", -1: "-"}.get(m, fmt(m))
        text = f"y = {coef}x" + ("" if b == 0 else f" {'-' if b < 0 else '+'} {fmt(abs(b))}")
    return {"m": m, "b": b, "vertical_x": None, "equation": text, "angle": _clean(formula.angle_of_inclination(m))}


def crossing(l1: dict, l2: dict) -> list | None:
    """Where the two lines meet, or None when they are parallel (or the same line)."""
    if l1["m"] is None and l2["m"] is None:
        return None
    if l1["m"] is None or l2["m"] is None:
        v, o = (l1, l2) if l1["m"] is None else (l2, l1)
        x = v["vertical_x"]
        return [x, _clean(o["m"] * x + o["b"])]
    if math.isclose(l1["m"], l2["m"], abs_tol=1e-12):
        return None
    x = (l2["b"] - l1["b"]) / (l1["m"] - l2["m"])
    return [_clean(x), _clean(l1["m"] * x + l1["b"])]


def _snap_outward(lo: float, hi: float, step: float) -> tuple[float, float]:
    return math.floor(lo / step) * step, math.ceil(hi / step) * step


def plot_window(points: list[list[float]]) -> Viewport:
    """A square-ish viewport around the four points, the origin and the crossing (when it is near)."""
    xs, ys = [p[0] for p in points] + [0.0], [p[1] for p in points] + [0.0]
    lo_x, hi_x, lo_y, hi_y = min(xs), max(xs), min(ys), max(ys)
    span = max(hi_x - lo_x, hi_y - lo_y, 4.0) * 1.3
    cx, cy = (lo_x + hi_x) / 2, (lo_y + hi_y) / 2
    step = nice_step(span)
    x_min, x_max = _snap_outward(cx - span / 2, cx + span / 2, step)
    y_min, y_max = _snap_outward(cy - span / 2, cy + span / 2, step)
    return Viewport(x_min, x_max, y_min, y_max, step, step)


@dataclass(frozen=True)
class LinesSolution:
    """Everything the page needs, computed once."""

    points: list
    line1: dict
    line2: dict
    parallel: bool
    perpendicular: bool
    same_line: bool
    relation: str
    product: float | None
    angle_between: float
    crossing: list | None
    window: Viewport

    def to_dict(self) -> dict:
        data = asdict(self)
        data["window"] = self.window.to_dict()
        return data


def solve(x1: float, y1: float, x2: float, y2: float, x3: float, y3: float, x4: float, y4: float) -> LinesSolution:
    """Line 1 through (x₁, y₁), (x₂, y₂) and line 2 through (x₃, y₃), (x₄, y₄): parallel, perpendicular or neither."""
    l1, l2 = line(x1, y1, x2, y2), line(x3, y3, x4, y4)
    points = dict(x1=x1, y1=y1, x2=x2, y2=y2, x3=x3, y3=y3, x4=x4, y4=y4)
    parallel = formula.is_parallel(**points)
    perpendicular = formula.is_perpendicular(**points)
    same = parallel and (l1["vertical_x"] == l2["vertical_x"] if l1["m"] is None else math.isclose(l1["b"], l2["b"], abs_tol=1e-9))
    relation = "same line" if same else "parallel" if parallel else "perpendicular" if perpendicular else "neither"
    product = None if l1["m"] is None or l2["m"] is None else _clean(l1["m"] * l2["m"])
    between = abs(l1["angle"] - l2["angle"])
    between = _clean(min(between, 180 - between))
    meet = crossing(l1, l2)
    pts = [[x1, y1], [x2, y2], [x3, y3], [x4, y4]]
    near = pts + ([meet] if meet and all(abs(c) <= 50 for c in meet) else [])
    return LinesSolution(
        points=pts, line1=l1, line2=l2, parallel=parallel, perpendicular=perpendicular, same_line=same,
        relation=relation, product=product, angle_between=between, crossing=meet, window=plot_window(near),
    )
