"""z = a + bi on the complex plane: i² = −1, the standard form, the conjugate and the modulus, step by step.

The mathematics lives in core/formula.py (section A2.3 Complex Numbers): i²,
z = a + bi, its conjugate z̄ = a − bi and its modulus |z| = √(a² + b²). This
module calls those and adds what the page needs around them: complex numbers
as text and JSON, the powers of i, which quadrant z sits in, and each formula
written out with the numbers. The JavaScript mirror
(html/static/complex_numbers_math.js) is kept identical by tests/test_js_parity.py.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass

from a1.solver import fmt
from core import formula
from factoring.solver import _clean, _p

I = formula.complex_standard_form(0, 1)  # i = 0 + 1i


def _pair(z: complex) -> dict:
    """A complex number as JSON: {'re': a, 'im': b}."""
    return {"re": _clean(z.real), "im": _clean(z.imag)}


def text(z: complex) -> str:
    """'a + bi' with zero parts and a redundant 1 dropped: '3 − 4i', '-2 + i', '5i', '7', '0'."""
    a, b = _clean(z.real), _clean(z.imag)
    if b == 0:
        return fmt(a)
    imaginary = "i" if abs(b) == 1 else f"{fmt(abs(b))}i"
    if a == 0:
        return imaginary if b > 0 else f"−{imaginary}"
    return f"{fmt(a)} {'−' if b < 0 else '+'} {imaginary}"


def kind(a: float, b: float) -> str:
    """Where z = a + bi sits: on an axis (real, purely imaginary, zero) or in a quadrant."""
    a, b = _clean(a), _clean(b)
    if a == 0 and b == 0:
        return "zero: the origin"
    if b == 0:
        return "real: on the real axis (b = 0)"
    if a == 0:
        return "purely imaginary: on the imaginary axis (a = 0)"
    quadrant = {(True, True): "I", (False, True): "II", (False, False): "III", (True, False): "IV"}[(a > 0, b > 0)]
    return f"complex: quadrant {quadrant}"


def powers() -> list[dict]:
    """i⁰ … i⁴: each multiplication by i is a quarter turn, so the powers repeat every four."""
    values, z = [], formula.complex_standard_form(1, 0)
    for n in range(5):
        values.append({"n": n, "value": _pair(z), "text": text(z)})
        z = z * I
    return values


def steps(a: float, b: float, z: complex, conjugate: complex, modulus: float, product: complex) -> list[dict]:
    """Each formula on the A2.3 card, with this z's numbers in it."""
    square = formula.complex_to_real(I)

    def worked(a_text: str, sign: str, b: float, z: complex) -> str:
        """'a ± (b)i = tidy', or just the tidy form when substituting adds nothing."""
        raw = f"{a_text} {sign} {_p(b)}i"
        return raw if raw == text(z) else f"{raw} = {text(z)}"

    return [
        {"id": "i", "title": "The imaginary unit: i² = −1", "math": f"i · i = i² = {fmt(square.real)}: i is the number whose square is −1, so √−1 = i"},
        {"id": "z", "title": "Standard form: z = a + bi", "math": f"z = {worked(fmt(a), '+', b, z)}: real part a = {fmt(a)}, imaginary part b = {fmt(b)}"},
        {"id": "conjugate", "title": "Conjugate: z̄ = a − bi", "math": f"z̄ = {worked(fmt(a), '−', b, conjugate)}: flip the sign of the imaginary part, a mirror image across the real axis"},
        {"id": "modulus", "title": "Modulus: |z| = √(a² + b²)", "math": f"|z| = √({_p(a)}² + {_p(b)}²) = √{fmt(a * a + b * b)} = {fmt(modulus)}: the distance from 0 to z"},
        {"id": "product", "title": "Together: z · z̄ = a² + b² = |z|²", "math": f"({text(z)})({text(conjugate)}) = a² − b²·i² = {fmt(a * a)} + {fmt(b * b)} = {fmt(product.real)}, a real number"},
    ]


@dataclass(frozen=True)
class ComplexSolution:
    """Everything the page needs, computed once."""

    inputs: dict
    z: dict
    conjugate: dict
    modulus: float
    product: dict
    texts: dict
    kind: str
    powers: list
    steps: list

    def to_dict(self) -> dict:
        return asdict(self)


def solve(a: float, b: float) -> ComplexSolution:
    """z = a + bi: its conjugate, modulus and the product z · z̄, with the steps."""
    z = formula.complex_standard_form(a, b)
    conjugate = formula.complex_conjugate(z)
    modulus = _clean(formula.complex_modulus(z))
    product = z * conjugate
    return ComplexSolution(
        inputs={"a": a, "b": b},
        z=_pair(z),
        conjugate=_pair(conjugate),
        modulus=modulus,
        product=_pair(product),
        texts={"z": text(z), "conjugate": text(conjugate), "modulus": fmt(modulus), "product": text(product)},
        kind=kind(a, b),
        powers=powers(),
        steps=steps(a, b, z, conjugate, modulus, product),
    )
