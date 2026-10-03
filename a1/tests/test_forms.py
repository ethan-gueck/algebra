import pytest

from core import formula
from a1.forms import equation, solve

CASES = [("vertex", 2, 1, -8), ("vertex", -0.5, -2, 4), ("vertex", 1, 3, 2), ("vertex", 1, 0, 0), ("vertex", -1, 0, 3), ("vertex", 0.25, 2, -1),
         ("standard", 1, -6, 5), ("standard", 3, 12, 7), ("standard", -2, 4, 6), ("standard", 1, 0, -4), ("factored", -1, -1, 5), ("factored", 2, 0.5, 0.5)]


@pytest.mark.parametrize("a, h, k", [(2, 1, -8), (-0.5, -2, 4), (1, 0, 0), (3, -1.5, 2.25)])
def test_vertex_form_round_trips_through_standard_form(a, h, k):
    _, b, c = formula.convert_vertex_form_to_standard_form(a, h, k)
    for x in (-3.0, -0.5, 0.0, 1.25, 4.0):
        assert formula.vertex_form(a, h, k, x) == pytest.approx(formula.parabola(a, b, c, x))
    assert formula.convert_standard_form_to_vertex_form(a, b, c) == pytest.approx((a, h, k))


def test_vertex_is_the_turning_point():
    a, h, k = formula.convert_standard_form_to_vertex_form(1, -6, 5)
    assert (h, k) == (3, -4)
    assert formula.vertex(1, -6, 5) == (h, k)
    assert formula.convert_factored_form_to_vertex_form(1, 1, 5) == (1, 3, -4)


@pytest.mark.parametrize("case", CASES)
def test_every_step_is_the_same_parabola(case):
    s = solve(*case)
    a, h, k = s.vertex["a"], s.vertex["h"], s.vertex["k"]
    b, c = s.standard["b"], s.standard["c"]
    assert formula.vertex_form(a, h, k, 0.7) == pytest.approx(formula.parabola(a, b, c, 0.7))
    assert s.equation == s.forms["vertex"]  # the page's equation matches the quadratic page's vertex form
    assert s.transformations[-1]["equation"] == s.equation
    assert s.completing_square[-1]["math"].endswith(s.equation) and s.shortcut[-1]["math"] == s.equation
    assert s.expanding[-1]["math"] == s.forms["standard"]
    assert (s.from_roots is not None) == (case[0] == "factored")


def test_transformations_describe_the_moves():
    titles = [t["title"] for t in solve("vertex", -0.5, -2, 4).transformations]
    assert titles == ["Start from the parent y = x²", "Shift left by 2", "Compress vertically by 0.5 and flip it (a < 0)", "Shift up by 4"]
    titles = [t["title"] for t in solve("vertex", 1, 0, 0).transformations]
    assert titles[1:] == ["No horizontal shift (h = 0)", "No stretch (a = 1)", "No vertical shift (k = 0)"]


def test_features():
    f = solve("vertex", 2, 1, -8).features
    assert f["extreme"] == "minimum y = -8 at x = 1" and f["range"] == "y ≥ -8" and f["width"].startswith("narrower")
    f = solve("vertex", -0.5, -2, 4).features
    assert f["opens"] == "down" and f["range"] == "y ≤ 4" and f["width"].startswith("wider")


def test_completing_the_square_steps():
    steps = [step["math"] for step in solve("standard", 3, 12, 7).completing_square]
    assert steps[0] == "y = 3(x² + 4x) + 7"
    assert steps[1] == "(b / 2a)² = (4 / 2)² = 4"
    assert steps[2] == "y = 3(x² + 4x + 4 - 4) + 7"
    assert steps[3].endswith("y = 3(x + 2)² - 12 + 7")
    assert steps[4] == "k = 7 − 3·4 = -5  →  y = 3(x + 2)² - 5"


@pytest.mark.parametrize("case, roots", [
    (("standard", 1, -3, 2), "x₁ = 1,  x₂ = 2"),
    (("standard", 1, -2, 1), "x = 1 (repeated)"),
    (("standard", 1, 2, 5), "x₁ = -1 − 2i,  x₂ = -1 + 2i"),
])
def test_quadratic_formula_steps(case, roots):
    steps = solve(*case).solving
    assert steps[-1]["math"] == roots
    assert ("imaginary" in steps[2]["title"]) == (case == ("standard", 1, 2, 5))


def test_equation_text():
    assert equation(1, 0, 0) == "y = x²"
    assert equation(-1, -2, 3) == "y = -(x + 2)² + 3"


def test_a_must_be_non_zero():
    with pytest.raises(ValueError):
        solve("vertex", 0, 1, 2)
