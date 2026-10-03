import math

import pytest

from complex_numbers.solver import kind, solve, text
from core import formula

CASES = [(3, 4), (-2, 5), (-4, -3), (1, 1), (0, 2), (5, 0), (0, 0), (0, -1), (1.5, -2.5), (-0.5, 0.25)]


def test_i_squared_is_minus_one():
    assert formula.complex_to_real(1j) == -1


def test_standard_form_conjugate_and_modulus():
    z = formula.complex_standard_form(3, 4)
    assert z == 3 + 4j
    assert formula.complex_conjugate(z) == 3 - 4j
    assert formula.complex_modulus(z) == 5


@pytest.mark.parametrize("a, b", CASES)
def test_conjugate_mirrors_and_keeps_the_modulus(a, b):
    s = solve(a, b)
    assert s.conjugate == {"re": s.z["re"], "im": -s.z["im"] or 0.0}
    assert s.modulus == pytest.approx(math.hypot(a, b))
    assert s.product == {"re": pytest.approx(s.modulus**2), "im": 0.0}  # z·z̄ = a² + b² = |z|², a real number


@pytest.mark.parametrize("z, expected", [(3 + 4j, "3 + 4i"), (3 - 4j, "3 − 4i"), (-2 + 1j, "-2 + i"), (5j, "5i"), (-1j, "−i"), (7, "7"), (0, "0"), (1.5 - 0.5j, "1.5 − 0.5i")])
def test_text(z, expected):
    assert text(complex(z)) == expected


def test_kind():
    assert kind(3, 4) == "complex: quadrant I" and kind(-1, -1) == "complex: quadrant III"
    assert kind(5, 0).startswith("real") and kind(0, 2).startswith("purely imaginary") and kind(0, 0).startswith("zero")


def test_powers_of_i_repeat_every_four():
    assert [p["text"] for p in solve(1, 1).powers] == ["1", "i", "-1", "−i", "1"]


def test_steps():
    steps = [step["math"] for step in solve(3, 4).steps]
    assert steps[0].startswith("i · i = i² = -1")
    assert steps[1].startswith("z = 3 + 4i: real part")
    assert steps[2].startswith("z̄ = 3 − 4i: flip")
    assert solve(2, -1).steps[1]["math"].startswith("z = 2 + (-1)i = 2 − i")
    assert steps[3].startswith("|z| = √(3² + 4²) = √25 = 5")
    assert steps[4].startswith("(3 + 4i)(3 − 4i) = a² − b²·i² = 9 + 16 = 25")
