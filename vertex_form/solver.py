"""The vertex form y = a(x − h)² + k: the parabola y = x² moved, stretched and lifted, step by step.

The mathematics lives in core/formula.py (section A1.12 Vertex Form): the
vertex form itself and the conversions into it and out of it. This module
calls those and adds what the page needs around them: the three
transformations of the parent y = x² that build a(x − h)² + k, what a, h and k
say about the graph, completing the square written out step by step, and the
expansion back to standard form. Everything else about the parabola (roots,
intercepts, plot window) comes from the quadratic solver, a1.solver.solve.
The JavaScript mirror (html/static/vertex_form_math.js) is kept identical by
tests/test_js_parity.py.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass

from a1 import solver as quadratic_solver
from a1.solver import fmt
from core import formula
from factoring.solver import FORMS, PARAMS, _clean, _coef, _p, _poly, _signed, to_standard


def _step(title: str, math_text: str) -> dict:
    return {"title": title, "math": math_text}


def _shifted(h: float) -> str:
    """'x' when h = 0, else '(x - h)' / '(x + |h|)'."""
    return "x" if _clean(h) == 0 else f"(x{_signed(-h)})"


def equation(a: float, h: float, k: float) -> str:
    """'y = a(x - h)² + k' with a redundant 1, a zero h and a zero k dropped."""
    return f"y = {_coef(a)}{_shifted(h)}²" + (_signed(k) if _clean(k) else "")


# ---- Building a(x − h)² + k from y = x² ------------------------------------


def transformations(a: float, h: float, k: float) -> list[dict]:
    """The parent y = x², then the shift by h, the stretch by a and the lift by k, each with its equation."""
    if _clean(h) > 0:
        shift = f"Shift right by {fmt(h)}"
    elif _clean(h) < 0:
        shift = f"Shift left by {fmt(-h)}"
    else:
        shift = "No horizontal shift (h = 0)"
    size = abs(a)
    if _clean(size - 1) == 0:
        stretch = "Flip it upside down (a = −1)" if a < 0 else "No stretch (a = 1)"
    else:
        stretch = f"{'Stretch' if size > 1 else 'Compress'} vertically by {fmt(size)}" + (" and flip it (a < 0)" if a < 0 else "")
    if _clean(k) > 0:
        lift = f"Shift up by {fmt(k)}"
    elif _clean(k) < 0:
        lift = f"Shift down by {fmt(-k)}"
    else:
        lift = "No vertical shift (k = 0)"
    return [
        {"id": "parent", "title": "Start from the parent y = x²", "equation": "y = x²",
         "math": "vertex (0, 0), axis x = 0, opens up"},
        {"id": "shift", "title": shift, "equation": equation(1, h, 0),
         "math": f"replace x with x − h = {_shifted(h).strip('()')}: the vertex slides from (0, 0) to ({fmt(h)}, 0)"},
        {"id": "stretch", "title": stretch, "equation": equation(a, h, 0),
         "math": f"multiply every height by a = {fmt(a)}: the vertex stays at ({fmt(h)}, 0) and the curve opens {formula.opens(a)}"},
        {"id": "lift", "title": lift, "equation": equation(a, h, k),
         "math": f"add k = {fmt(k)} to every height: the vertex lands on ({fmt(h)}, {fmt(k)})"},
    ]


def features(a: float, h: float, k: float) -> dict:
    """What a, h and k say about the graph, read straight off the vertex form."""
    size = abs(a)
    if _clean(size - 1) == 0:
        width = "the same width as y = x² (|a| = 1)"
    elif size > 1:
        width = f"narrower than y = x² (|a| = {fmt(size)} > 1)"
    else:
        width = f"wider than y = x² (|a| = {fmt(size)} < 1)"
    up = formula.opens(a) == "up"
    return {
        "vertex": [h, k],
        "axis": h,
        "opens": formula.opens(a),
        "extreme": f"{'minimum' if up else 'maximum'} y = {fmt(k)} at x = {fmt(h)}",
        "range": f"y {'≥' if up else '≤'} {fmt(k)}",
        "width": width,
    }


# ---- Converting into and out of vertex form ---------------------------------


def completing_the_square(a: float, b: float, c: float, h: float, k: float) -> list[dict]:
    """Standard → vertex form: complete the square on ax² + bx + c."""
    half = b / (2 * a)
    square = _clean(half**2)
    constant = _signed(c) if _clean(c) else ""
    return [
        _step("Factor a out of the x-terms", f"y = {_coef(a)}({_poly(1, b / a, 0)}){constant}"),
        _step("Halve the x-coefficient and square it", f"(b / 2a)² = ({fmt(b / a)} / 2)² = {fmt(square)}"),
        _step("Add and subtract it inside the bracket", f"y = {_coef(a)}({_poly(1, b / a, square)} - {fmt(square)}){constant}"),
        _step("Fold the first three terms into a square", f"x² + (b/a)x + (b / 2a)² = {_shifted(h)}²  →  y = {_coef(a)}{_shifted(h)}²{_signed(-a * square)}{constant}"),
        _step("Collect the constant: k = c − a(b / 2a)²", f"k = {fmt(c)} − {_p(a)}·{fmt(square)} = {fmt(k)}  →  {equation(a, h, k)}"),
    ]


def shortcut(a: float, b: float, c: float, h: float, k: float) -> list[dict]:
    """Standard → vertex form the quick way: h = −b / 2a, then k = f(h)."""
    return [
        _step("Find h, the axis of symmetry", f"h = −b / 2a = −{_p(b)} / (2·{_p(a)}) = {fmt(h)}"),
        _step("Find k by substituting h", f"k = ah² + bh + c = {_p(a)}·{_p(h)}² + {_p(b)}·{_p(h)} + {_p(c)} = {fmt(k)}"),
        _step("Write a(x − h)² + k", equation(a, h, k)),
    ]


def expanding(a: float, h: float, k: float, b: float, c: float, standard: str) -> list[dict]:
    """Vertex → standard form: expand the square and collect the coefficients."""
    return [
        _step("Expand the square", f"(x − h)² = x² − 2hx + h²  →  y = {_coef(a)}({_poly(1, -2 * h, h * h)}){_signed(k) if _clean(k) else ''}"),
        _step("Collect the coefficients", f"b = −2ah = −2·{_p(a)}·{_p(h)} = {fmt(b)},  c = ah² + k = {_p(a)}·{_p(h)}² + {_p(k)} = {fmt(c)}"),
        _step("Write ax² + bx + c", standard),
    ]


def from_roots(a: float, r1: float, r2: float, h: float, k: float) -> list[dict]:
    """Factored → vertex form: the vertex sits midway between the roots."""
    return [
        _step("h is midway between the roots", f"h = (r₁ + r₂) / 2 = ({fmt(r1)} + {_p(r2)}) / 2 = {fmt(h)}"),
        _step("k is the height there", f"k = a(h − r₁)(h − r₂) = {_p(a)}·({fmt(h)} − {_p(r1)})·({fmt(h)} − {_p(r2)}) = {fmt(k)}"),
        _step("Write a(x − h)² + k", equation(a, h, k)),
    ]


@dataclass(frozen=True)
class VertexFormSolution:
    """Everything the page needs, computed once."""

    form: str
    inputs: dict
    vertex: dict
    standard: dict
    factored: dict | None
    equation: str
    forms: dict
    quadratic: dict
    transformations: list
    features: dict
    completing_square: list
    shortcut: list
    expanding: list
    from_roots: list | None

    def to_dict(self) -> dict:
        return asdict(self)


def solve(form: str, a: float, p: float, q: float) -> VertexFormSolution:
    """The quadratic given in ``form`` by (a, p, q), written as a(x − h)² + k, with the steps to and from it."""
    if a == 0:
        raise ValueError("'a' must be non-zero; with a = 0 the equation is linear, not quadratic.")
    a, b, c = to_standard(form, a, p, q)
    quadratic = quadratic_solver.solve(a, b, c).to_dict()
    if form == "vertex":
        h, k = p, q
    elif form == "factored":
        _, h, k = formula.convert_factored_form_to_vertex_form(a, p, q)
    else:
        _, h, k = formula.convert_standard_form_to_vertex_form(a, b, c)
    h, k = _clean(h), _clean(k)
    xs = [x for x, _ in quadratic["x_intercepts"]]
    fac = None
    if form == "factored":
        fac = {"a": a, "r1": min(p, q), "r2": max(p, q)}
    elif xs:
        fac = {"a": a, "r1": xs[0], "r2": xs[-1]}
    return VertexFormSolution(
        form=form,
        inputs=dict(zip(PARAMS[form], (a, p, q))),
        vertex={"a": a, "h": h, "k": k},
        standard={"a": a, "b": b, "c": c},
        factored=fac,
        equation=equation(a, h, k),
        forms={name: quadratic[f"{name}_form"] for name in FORMS},
        quadratic=quadratic,
        transformations=transformations(a, h, k),
        features=features(a, h, k),
        completing_square=completing_the_square(a, b, c, h, k),
        shortcut=shortcut(a, b, c, h, k),
        expanding=expanding(a, h, k, b, c, quadratic["standard_form"]),
        from_roots=from_roots(a, p, q, h, k) if form == "factored" else None,
    )
