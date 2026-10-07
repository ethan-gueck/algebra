"""One quadratic in standard, vertex and factored form: the conversions and the factoring, step by step.

The mathematics lives in core/formula.py (sections A1.9 Polynomial Products,
A1.10 Factoring and A1.12 Vertex Form): the special products factoring
reverses, the three forms and the conversions between them. This module
calls those and adds what the page needs around them: float tidying, the
discriminant test for whether the quadratic factors, the AC-method or
quadratic-formula factoring process, and each conversion written out as
steps. Everything else about the parabola (vertex, intercepts, plot window)
comes from the quadratic solver, a1.solver.solve. The JavaScript mirror
(html/static/factoring_math.js) is kept identical by tests/test_js_parity.py.
"""

from __future__ import annotations

import math
from dataclasses import asdict, dataclass

from a1 import solver as quadratic_solver
from a1.solver import fmt
from core import formula

FORMS = ("standard", "vertex", "factored")
PARAMS = {"standard": ("a", "b", "c"), "vertex": ("a", "h", "k"), "factored": ("a", "r1", "r2")}


def _clean(value: float) -> float:
    """Round away float noise (e.g. 1.9999999999 -> 2.0, -0.0 -> 0.0)."""
    rounded = round(value, 10)
    return 0.0 if rounded == 0 else rounded


def _p(value: float) -> str:
    """A number ready to multiply: negatives in brackets, '(-3)'."""
    return f"({fmt(value)})" if _clean(value) < 0 else fmt(value)


def _signed(value: float, symbol: str = "") -> str:
    """A term with an explicit sign, e.g. ' - 3x' or ' + 2'."""
    return f" {'-' if _clean(value) < 0 else '+'} {fmt(abs(value))}{symbol}"


def _coef(value: float, symbol: str = "") -> str:
    """A coefficient without a redundant 1: (1, 'x') -> 'x', (-1, 'x') -> '-x', (2, 'x') -> '2x'."""
    v = _clean(value)
    return ("" if v == 1 else "-" if v == -1 else fmt(v)) + symbol


def _term(value: float, symbol: str = "") -> str:
    """A following term with its sign and no redundant 1: (-1, 'x') -> ' - x', (3, 'x') -> ' + 3x', (-1, '') -> ' - '."""
    return f" {'-' if _clean(value) < 0 else '+'} {_coef(abs(value), symbol)}"


def _poly(a: float, b: float, c: float) -> str:
    """'ax² + bx + c' with zero terms dropped."""
    text = _coef(a, "x²")
    if _clean(b):
        text += _term(b, "x")
    if _clean(c):
        text += _signed(c)
    return text


def _binomial(p: float, q: float) -> str:
    """'(px + q)'."""
    return f"({_coef(p, 'x')}{_signed(q) if _clean(q) else ''})"


def _whole(value: float) -> bool:
    return abs(value - round(value)) < 1e-9


def _step(title: str, math_text: str) -> dict:
    return {"title": title, "math": math_text}


def to_standard(form: str, a: float, p: float, q: float) -> tuple[float, float, float]:
    """(a, b, c) of ax² + bx + c from any form's three numbers."""
    if form == "vertex":
        a, b, c = formula.convert_vertex_form_to_standard_form(a, p, q)
    elif form == "factored":
        a, b, c = formula.convert_factored_form_to_standard_form(a, p, q)
    elif form == "standard":
        b, c = p, q
    else:
        raise ValueError(f"form must be one of {', '.join(FORMS)}")
    return a, _clean(b), _clean(c)


# ---- Can it be factored? ----------------------------------------------------


def factorability(a: float, b: float, c: float, d: float, nature: str) -> dict:
    """What the discriminant says about factoring ax² + bx + c."""
    whole = all(_whole(v) for v in (a, b, c))
    square = d >= 0 and _whole(d) and math.isqrt(round(d)) ** 2 == round(d)
    if nature.startswith("two complex"):
        return {
            "over_reals": False, "over_integers": False, "verdict": "No: it can't be factored over the real numbers.",
            "reason": f"Δ = {fmt(d)} < 0, so the parabola never touches the x-axis: there are no real roots to factor out.",
        }
    if nature.startswith("one repeated"):
        return {
            "over_reals": True, "over_integers": whole and square, "verdict": "Yes: it's a perfect square.",
            "reason": "Δ = 0, so there is one repeated root r and y = a(x − r)².",
        }
    if whole and square:
        return {
            "over_reals": True, "over_integers": True, "verdict": "Yes: it factors over the integers.",
            "reason": f"Δ = {fmt(d)} = {math.isqrt(round(d))}² is a perfect square, so the roots are rational and the AC method finds whole-number factors.",
        }
    if whole:
        return {
            "over_reals": True, "over_integers": False, "verdict": "Yes, over the real numbers, but not over the integers.",
            "reason": f"Δ = {fmt(d)} > 0 isn't a perfect square, so the roots (−b ± √Δ) / 2a are irrational.",
        }
    return {
        "over_reals": True, "over_integers": False, "verdict": "Yes: it factors over the real numbers.",
        "reason": f"Δ = {fmt(d)} > 0, so there are two real roots r₁, r₂ and y = a(x − r₁)(x − r₂).",
    }


def _discriminant_step(a: float, b: float, c: float, d: float, note: str = "") -> dict:
    return _step("Check the discriminant", f"Δ = b² − 4ac = {_p(b)}² − 4·{_p(a)}·{_p(c)} = {fmt(d)}{note}")


def ac_method_steps(a: int, b: int, c: int, d: int) -> tuple[list[dict], str]:
    """Factor ax² + bx + c with whole numbers (Δ a perfect square): GCF, AC method, grouping."""
    root = math.isqrt(d)
    steps = [_discriminant_step(a, b, c, d, ", so it is a perfect square trinomial" if d == 0 else f" = {root}², a perfect square")]
    g = math.gcd(a, b, c) * (-1 if a < 0 else 1)
    a1, b1, c1 = a // g, b // g, c // g
    prefix = _coef(g)
    if g != 1:
        steps.append(_step("Factor out the greatest common factor", f"y = {prefix}({_poly(a1, b1, c1)})"))
    if c1 == 0:
        steps.append(_step("No constant term: factor out x", f"{_poly(a1, b1, 0)} = x{_binomial(a1, b1)}"))
        steps.append(_step("Set each factor to 0", f"x = 0,  x = {fmt(-b1 / a1)}"))
        return steps, f"y = {prefix}x{_binomial(a1, b1)}"
    m, n = (round(v) for v in formula.ac_method(a1, b1, c1))
    steps.append(_step("AC method: find m and n", f"m·n = a·c = {a1}·{_p(c1)} = {a1 * c1}  and  m + n = b = {b1}  →  m = {m}, n = {n}"))
    steps.append(_step("Split the middle term", f"{_coef(a1, 'x²')}{_term(m, 'x')}{_term(n, 'x')}{_signed(c1)}"))
    g1 = math.gcd(a1, m)
    p, q = a1 // g1, m // g1
    g2 = n // p
    steps.append(_step("Group the pairs and factor each", f"{_coef(g1, 'x')}{_binomial(p, q)}{_term(g2)}{_binomial(p, q)}"))
    # The two factors, ordered by the root each gives (smallest first, as in a(x − r₁)(x − r₂)).
    pairs = sorted([(-g2 / g1, _binomial(g1, g2)), (-q / p, _binomial(p, q))], key=lambda t: t[0])
    factors = f"{pairs[0][1]}²" if pairs[0][1] == pairs[1][1] else f"{pairs[0][1]}{pairs[1][1]}"
    steps.append(_step("Factor out the common binomial", factors))
    zeros = [fmt(z) for z, _ in pairs]
    steps.append(_step("Set each factor to 0", f"x = {zeros[0]}" if zeros[0] == zeros[1] else f"x = {zeros[0]},  x = {zeros[1]}"))
    return steps, f"y = {prefix}{factors}"


def factoring_steps(a: float, b: float, c: float, quadratic: dict, info: dict) -> tuple[list[dict], str | None]:
    """The factoring process and the factored form it ends with (None when there are no real roots)."""
    d = quadratic["discriminant"]
    if not info["over_reals"]:
        z = quadratic["roots"][1]
        return [
            _discriminant_step(a, b, c, d, " < 0"),
            _step("Stop: no real factors", f"The roots are complex, z = {fmt(z['re'])} ± {fmt(z['im'])}i, so over the complex numbers only: a(x − z₁)(x − z₂)."),
        ], None
    if info["over_integers"]:
        return ac_method_steps(round(a), round(b), round(c), round(d))
    r1, r2 = quadratic["x_intercepts"][0][0], quadratic["x_intercepts"][-1][0]
    note = " isn't a perfect square" if all(_whole(v) for v in (a, b, c)) and d > 0 else ""
    roots = f"r = −b / 2a = {fmt(r1)}" if r1 == r2 else f"r₁ = {fmt(r1)},  r₂ = {fmt(r2)}"
    return [
        _discriminant_step(a, b, c, d, note),
        _step("Find the roots with the quadratic formula", f"r = (−b ± √Δ) / 2a = ({fmt(-b)} ± √{fmt(d)}) / {_p(2 * a)}  →  {roots}"),
        _step("Write a(x − r₁)(x − r₂)", quadratic["factored_form"]),
    ], quadratic["factored_form"]


# ---- Converting to the other forms -----------------------------------------


def _roots_text(r1: float, r2: float) -> str:
    return f"r₁ = r₂ = {fmt(r1)}" if r1 == r2 else f"r₁ = {fmt(r1)},  r₂ = {fmt(r2)}"


def conversions(form: str, a: float, p: float, q: float, std: dict, vtx: dict, fac: dict | None, texts: dict, d: float) -> list[dict]:
    """The two conversions out of the chosen form, each as steps ending in the converted equation."""
    b, c, h, k = std["b"], std["c"], vtx["h"], vtx["k"]
    out = []
    if form == "standard":
        out.append({"to": "vertex", "title": "Standard → vertex form (complete the square)", "result": texts["vertex"], "steps": [
            _step("Find h, the axis of symmetry", f"h = −b / 2a = −{_p(b)} / (2·{_p(a)}) = {fmt(h)}"),
            _step("Find k by substituting h", f"k = ah² + bh + c = {_p(a)}·{_p(h)}² + {_p(b)}·{_p(h)} + {_p(c)} = {fmt(k)}"),
            _step("Write a(x − h)² + k", texts["vertex"]),
        ]})
        steps = [_discriminant_step(a, b, c, d)]
        if fac is None:
            steps.append(_step("Δ < 0: no real roots", "The parabola never crosses the x-axis, so there is no real factored form."))
        else:
            steps.append(_step("Use the quadratic formula", f"r = (−b ± √Δ) / 2a = ({fmt(-b)} ± √{fmt(d)}) / {_p(2 * a)}  →  {_roots_text(fac['r1'], fac['r2'])}"))
            steps.append(_step("Write a(x − r₁)(x − r₂)", texts["factored"]))
        out.append({"to": "factored", "title": "Standard → factored form (find the roots)", "result": texts["factored"], "steps": steps})
    elif form == "vertex":
        out.append({"to": "standard", "title": "Vertex → standard form (expand)", "result": texts["standard"], "steps": [
            _step("Expand the square", f"(x − h)² = x² − 2hx + h²  →  y = {_coef(a, '')}({_poly(1, -2 * h, h * h)}){_signed(k) if _clean(k) else ''}"),
            _step("Collect the coefficients", f"b = −2ah = −2·{_p(a)}·{_p(h)} = {fmt(b)},  c = ah² + k = {_p(a)}·{_p(h)}² + {_p(k)} = {fmt(c)}"),
            _step("Write ax² + bx + c", texts["standard"]),
        ]})
        square = _clean(-k / a)
        steps = [_step("Set y = 0 and isolate the square", f"(x − h)² = −k / a = −{_p(k)} / {_p(a)} = {fmt(square)}")]
        if fac is None:
            steps.append(_step("A square can't be negative", f"(x − h)² = {fmt(square)} has no real solution, so there is no real factored form."))
        else:
            steps.append(_step("Take the square root", f"x = h ± √(−k / a) = {fmt(h)} ± √{fmt(square)}  →  {_roots_text(fac['r1'], fac['r2'])}"))
            steps.append(_step("Write a(x − r₁)(x − r₂)", texts["factored"]))
        out.append({"to": "factored", "title": "Vertex → factored form (solve for the roots)", "result": texts["factored"], "steps": steps})
    else:
        out.append({"to": "standard", "title": "Factored → standard form (multiply out)", "result": texts["standard"], "steps": [
            _step("Multiply the factors", f"(x − r₁)(x − r₂) = x² − (r₁ + r₂)x + r₁r₂  →  y = {_coef(a, '')}({_poly(1, -(p + q), p * q)})"),
            _step("Collect the coefficients", f"b = −a(r₁ + r₂) = −{_p(a)}·({fmt(p)} + {_p(q)}) = {fmt(b)},  c = a·r₁·r₂ = {_p(a)}·{_p(p)}·{_p(q)} = {fmt(c)}"),
            _step("Write ax² + bx + c", texts["standard"]),
        ]})
        out.append({"to": "vertex", "title": "Factored → vertex form (midway between the roots)", "result": texts["vertex"], "steps": [
            _step("h is midway between the roots", f"h = (r₁ + r₂) / 2 = ({fmt(p)} + {_p(q)}) / 2 = {fmt(h)}"),
            _step("k is the height there", f"k = a(h − r₁)(h − r₂) = {_p(a)}·({fmt(h)} − {_p(p)})·({fmt(h)} − {_p(q)}) = {fmt(k)}"),
            _step("Write a(x − h)² + k", texts["vertex"]),
        ]})
    return out


# ---- Special products (A1.9) -----------------------------------------------


def special_products_table(a: float, b: float) -> dict:
    """The A1.9 products with numbers a, b, and the quadratics in x they become.

    Each row has both sides written out, their float values, whether == agrees
    and the formula's math.isclose verdict (formula.polynomial_products checks
    both squares at once, so the two square rows share it). ``patterns`` are
    the same products with ax in place of a, ready for the factoring above:
    (ax + b)² = a²x² + 2abx + b², and so on (empty when a or b is 0).
    """
    a, b = float(a), float(b)
    pa, pb = _p(a), _p(b)
    squares = formula.polynomial_products(a, b)
    rows = [
        ("square_sum", "Square of a sum", "(a + b)² = a² + 2ab + b²", f"({fmt(a)} + {pb})²", f"{pa}² + 2·{pa}·{pb} + {pb}²",
         (a + b) ** 2, a ** 2 + 2 * a * b + b ** 2, squares),
        ("square_difference", "Square of a difference", "(a − b)² = a² − 2ab + b²", f"({fmt(a)} − {pb})²", f"{pa}² − 2·{pa}·{pb} + {pb}²",
         (a - b) ** 2, a ** 2 - 2 * a * b + b ** 2, squares),
        ("difference_of_squares", "Difference of squares", "(a + b)(a − b) = a² − b²", f"({fmt(a)} + {pb})({fmt(a)} − {pb})", f"{pa}² − {pb}²",
         (a + b) * (a - b), a ** 2 - b ** 2, formula.special_products(a, b)),
    ]
    out = [{"id": i, "name": name, "rule": rule, "left": left, "right": right, "values": [lv, rv],
            "equal": lv == rv, "holds": holds} for i, name, rule, left, right, lv, rv, holds in rows]
    patterns = []
    if _clean(a) and _clean(b):
        for name, product, coefs in [
            ("Perfect square trinomial", f"{_binomial(a, b)}²", (a * a, 2 * a * b, b * b)),
            ("Perfect square trinomial", f"{_binomial(a, -b)}²", (a * a, -2 * a * b, b * b)),
            ("Difference of squares", f"{_binomial(a, b)}{_binomial(a, -b)}", (a * a, 0.0, -b * b)),
        ]:
            A, B, C = (_clean(v) for v in coefs)
            patterns.append({"name": name, "product": product, "expanded": _poly(A, B, C), "standard": [A, B, C]})
    return {"rows": out, "patterns": patterns}


@dataclass(frozen=True)
class FactoringSolution:
    """Everything the page needs, computed once."""

    form: str
    inputs: dict
    standard: dict
    vertex: dict
    factored: dict | None
    forms: dict
    quadratic: dict
    factorable: dict
    conversions: list
    factoring: list
    factored_result: str | None

    def to_dict(self) -> dict:
        return asdict(self)


def solve(form: str, a: float, p: float, q: float) -> FactoringSolution:
    """The quadratic given in ``form`` by (a, p, q), written in all three forms, with the steps between them."""
    if a == 0:
        raise ValueError("'a' must be non-zero; with a = 0 the equation is linear, not quadratic.")
    a, b, c = to_standard(form, a, p, q)
    quadratic = quadratic_solver.solve(a, b, c).to_dict()
    if form == "vertex":
        h, k = p, q
    else:
        _, h, k = formula.convert_factored_form_to_vertex_form(a, p, q) if form == "factored" else formula.convert_standard_form_to_vertex_form(a, b, c)
    vtx = {"a": a, "h": _clean(h), "k": _clean(k)}
    xs = [x for x, _ in quadratic["x_intercepts"]]
    fac = None
    if form == "factored":
        fac = {"a": a, "r1": min(p, q), "r2": max(p, q)}
    elif xs:
        fac = {"a": a, "r1": xs[0], "r2": xs[-1]}
    texts = {form_name: quadratic[f"{form_name}_form"] for form_name in FORMS}
    std = {"a": a, "b": b, "c": c}
    info = factorability(a, b, c, quadratic["discriminant"], quadratic["root_nature"])
    steps, result = factoring_steps(a, b, c, quadratic, info)
    return FactoringSolution(
        form=form,
        inputs=dict(zip(PARAMS[form], (a, p, q))),
        standard=std,
        vertex=vtx,
        factored=fac,
        forms=texts,
        quadratic=quadratic,
        factorable=info,
        conversions=conversions(form, a, p, q, std, vtx, fac, texts, quadratic["discriminant"]),
        factoring=steps,
        factored_result=result,
    )
