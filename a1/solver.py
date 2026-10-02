"""The quadratic y = ax² + bx + c: the solver the page uses, built on core/formula.py.

core/formula.py holds the mathematics as written (A1.11 Quadratic Formula and
A1.12 Vertex Form). This module calls it and adds what the page needs: input
checks, float tidying, sorted and real/complex-aware results, the forms as text
and a plot window. Pure Python with no plotting dependencies; both
``animations/`` and ``html/`` consume it. The JavaScript mirror
(html/static/quadratic_math.js) is kept identical by tests/test_js_parity.py.
"""

from __future__ import annotations

import math
from dataclasses import asdict, dataclass

from core.formula import (
    axis_of_symmetry,
    discriminant,
    opens,
    parabola,
    quadratic_formula,
    vertex,
    y_intercept_of_parabola,
)
from general.plotting import Viewport, fit_viewport


def _validate(a: float) -> None:
    if a == 0:
        raise ValueError("'a' must be non-zero; with a = 0 the equation is linear, not quadratic.")


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


def evaluate(a: float, b: float, c: float, x: float) -> float:
    """y = ax² + bx + c (parabola)."""
    return parabola(a, b, c, x)


def root_nature(a: float, b: float, c: float) -> str:
    """Describe the roots from the sign of the discriminant."""
    d = discriminant(a, b, c)
    if _is_zero(d, b * b, 4 * a * c):
        return "one repeated real root"
    return "two distinct real roots" if d > 0 else "two complex conjugate roots"


def roots(a: float, b: float, c: float) -> tuple[complex, complex]:
    """Both roots of ax² + bx + c = 0, sorted (real part, then imaginary part).

    This is quadratic_formula, with one rewrite for real roots: the
    equivalent q = -(b + sign(b)·√Δ) / 2, x₁ = q / a, x₂ = c / q, which avoids
    losing digits to cancellation when b² ≫ 4ac. Real roots are returned as
    ``complex`` with ``imag == 0`` so callers get one consistent type; use
    :func:`intercept_points` for real-only values.
    """
    _validate(a)
    d = discriminant(a, b, c)
    if _is_zero(d, b * b, 4 * a * c):
        x = _clean(-b / (2 * a))
        return complex(x, 0), complex(x, 0)
    if d > 0:
        q = -0.5 * (b + math.copysign(math.sqrt(d), b))
        x1, x2 = sorted((_clean(q / a), _clean(c / q)))
        return complex(x1, 0), complex(x2, 0)
    z1, z2 = quadratic_formula(a, b, c)
    re = _clean(z1.real)
    im = _clean(abs(z1.imag))
    return complex(re, -im), complex(re, im)


def intercept_points(a: float, b: float, c: float) -> list[tuple[float, float]]:
    """Real x-intercepts as (x, 0) points; empty when Δ < 0, one point when Δ = 0.

    x_intercepts, taken from :func:`roots` so a near-zero Δ counts as one root.
    """
    r1, r2 = roots(a, b, c)
    if r1.imag != 0:
        return []
    xs = [r1.real] if r1 == r2 else [r1.real, r2.real]
    return [(x, 0.0) for x in xs]


def vertex_point(a: float, b: float, c: float) -> tuple[float, float]:
    """Turning point (h, k) with h = -b / 2a and k = f(h) (vertex)."""
    _validate(a)
    h, k = vertex(a, b, c)
    return _clean(h), _clean(k)


def axis_x(a: float, b: float, c: float) -> float:
    """The vertical line x = -b / 2a (axis_of_symmetry)."""
    _validate(a)
    return _clean(axis_of_symmetry(a, b))


def y_intercept_point(a: float, b: float, c: float) -> tuple[float, float]:
    """Where the curve crosses x = 0: (0, c) (y_intercept)."""
    x, y = y_intercept_of_parabola(a, b, c)
    return float(x), _clean(y)


def direction(a: float) -> str:
    """'up' when a > 0 (vertex is a minimum), 'down' when a < 0 (maximum) (opens)."""
    _validate(a)
    return opens(a)


def _signed(value: float, symbol: str = "") -> str:
    """Format a term with an explicit sign, e.g. ' - 3x' or ' + 2'."""
    sign = "-" if value < 0 else "+"
    return f" {sign} {fmt(abs(value))}{symbol}"


def _coef(value: float) -> str:
    """Leading coefficient without a redundant 1: 1 -> '', -1 -> '-', 2 -> '2'."""
    return {1: "", -1: "-"}.get(_clean(value), fmt(value))


def standard_form_text(a: float, b: float, c: float) -> str:
    """'y = ax² + bx + c' with zero terms dropped and signs tidied."""
    text = f"y = {_coef(a)}x²"
    if b in (1, -1):
        return text + f" {'+' if b > 0 else '-'} x" + (_signed(c) if c else "")
    if b:
        text += _signed(b, "x")
    if c:
        text += _signed(c)
    return text


def _shifted_x(h: float) -> str:
    """'x' when h = 0, else '(x - h)' / '(x + |h|)'."""
    return "x" if h == 0 else f"(x{_signed(-h)})"


def vertex_form_text(a: float, b: float, c: float) -> str:
    """'y = a(x - h)² + k'."""
    h, k = vertex_point(a, b, c)
    return f"y = {_coef(a)}{_shifted_x(h)}²" + (_signed(k) if k else "")


def factored_form_text(a: float, b: float, c: float) -> str | None:
    """'y = a(x - r₁)(x - r₂)' when the roots are real, else ``None``."""
    if not intercept_points(a, b, c):
        return None
    r1, r2 = roots(a, b, c)
    if r1 == r2:
        return f"y = {_coef(a)}{_shifted_x(r1.real)}²"
    return f"y = {_coef(a)}{_shifted_x(r1.real)}{_shifted_x(r2.real)}"


def curve_points(a: float, b: float, c: float, x_min: float, x_max: float, n: int = 200) -> list[tuple[float, float]]:
    """``n`` evenly spaced (x, y) samples of the parabola between x_min and x_max."""
    step = (x_max - x_min) / (n - 1)
    return [(x_min + i * step, evaluate(a, b, c, x_min + i * step)) for i in range(n)]


def plot_window(a: float, b: float, c: float) -> Viewport:
    """A viewport that frames the vertex, real roots and y-intercept."""
    h, k = vertex_point(a, b, c)
    xs = [h, 0.0] + [x for x, _ in intercept_points(a, b, c)]
    return fit_viewport(xs, lambda x: evaluate(a, b, c, x), always_include_y=[k, c, 0.0])


@dataclass(frozen=True)
class QuadraticSolution:
    """Everything the animation and HTML layers need, computed once."""

    a: float
    b: float
    c: float
    discriminant: float
    root_nature: str
    roots: tuple[complex, complex]
    x_intercepts: list[tuple[float, float]]
    vertex: tuple[float, float]
    axis_of_symmetry: float
    y_intercept: tuple[float, float]
    direction: str
    standard_form: str
    vertex_form: str
    factored_form: str | None
    window: Viewport

    def to_dict(self) -> dict:
        """JSON-safe dict (complex roots become {'re': .., 'im': ..})."""
        data = asdict(self)
        data["roots"] = [{"re": r.real, "im": r.imag} for r in self.roots]
        data["window"] = self.window.to_dict()
        return data


def solve(a: float, b: float, c: float) -> QuadraticSolution:
    """Run every calculation for ax² + bx + c and bundle the results."""
    _validate(a)
    return QuadraticSolution(
        a=a,
        b=b,
        c=c,
        discriminant=_clean(discriminant(a, b, c)),
        root_nature=root_nature(a, b, c),
        roots=roots(a, b, c),
        x_intercepts=intercept_points(a, b, c),
        vertex=vertex_point(a, b, c),
        axis_of_symmetry=axis_x(a, b, c),
        y_intercept=y_intercept_point(a, b, c),
        direction=direction(a),
        standard_form=standard_form_text(a, b, c),
        vertex_form=vertex_form_text(a, b, c),
        factored_form=factored_form_text(a, b, c),
        window=plot_window(a, b, c),
    )

# ___________ Linear case (a = 0) _____________

def solve_linear(b: float, c: float) -> dict:
    """The degenerate a = 0 case, y = bx + c, so sliders can pass through a = 0.

    As a → 0 the parabola flattens into this line: one root tends to -c/b and
    the vertex and other root run off to infinity. Returns a JSON-safe dict.
    """
    if b == 0:
        nature = "every x is a root (y = 0)" if c == 0 else "no roots (horizontal line)"
        root = None
        form = "y = 0" if c == 0 else f"y = {fmt(c)}"
    else:
        nature = "one root (linear)"
        root = _clean(-c / b)
        form = (f"y = {_coef(b)}x" if b not in (1, -1) else f"y = {'-' if b < 0 else ''}x") + (_signed(c) if c else "")
    return {
        "a": 0.0,
        "b": b,
        "c": c,
        "linear": True,
        "root_nature": nature,
        "root": root,
        "x_intercepts": [] if root is None else [[root, 0.0]],
        "y_intercept": [0.0, _clean(c)],
        "standard_form": form,
    }
