import math

import pytest

from core import formula
from functions.solver import FAMILIES, outputs, solve


def test_function_notation_substitutes():
    assert formula.function_notation(lambda x: 2 * x + 1, 3) == 7  # the card's example


def test_domain_restrictions():
    assert formula.denominator_allowed(1) and not formula.denominator_allowed(0)
    assert formula.even_root_allowed(0) and formula.even_root_allowed(4) and not formula.even_root_allowed(-1)
    assert formula.log_allowed(0.5) and not formula.log_allowed(0) and not formula.log_allowed(-2)


def test_vertical_line_test():
    assert formula.vertical_line_test([(1, 2), (2, 4), (1, 2)])          # repeating a pair is fine
    assert formula.vertical_line_test([(-1, 1), (1, 1)])                 # two x share a y: still a function
    assert not formula.vertical_line_test([(4, 2), (4, -2)])             # x = y²: one x, two y


@pytest.mark.parametrize("family, a, h, k, domain, range_", [
    ("linear", 2, 0, 1, "(−∞, ∞)", "(−∞, ∞)"),
    ("quadratic", -1, 1, 4, "(−∞, ∞)", "(−∞, 4]"),
    ("reciprocal", 1, 2, 0, "(−∞, 2) ∪ (2, ∞)", "(−∞, 0) ∪ (0, ∞)"),
    ("sqrt", 1, 1, 1, "[1, ∞)", "[1, ∞)"),
    ("sqrt", -2, -3, 0, "[−3, ∞)", "(−∞, 0]"),
    ("log", 1, -1, 0, "(−1, ∞)", "(−∞, ∞)"),
    ("sideways", 1, -2, 0, "[−2, ∞)", "(−∞, ∞)"),
    ("sideways", -1, 3, 0, "(−∞, 3]", "(−∞, ∞)"),
])
def test_domain_and_range(family, a, h, k, domain, range_):
    s = solve(a, h, k, 0, family)
    assert (s.domain_text, s.range_text) == (domain, range_)


def test_evaluate_inside_and_outside_the_domain():
    assert solve(2, 0, 1, 3, "linear").value == 7
    assert solve(1, 2, 0, 4).value == 0.5 and solve(1, 2, 0, 4).equation == "f(x) = 1 / (x − 2)"
    divide = solve(1, 2, 0, 2)
    assert not divide.in_domain and divide.value is None and divide.hits == []
    assert solve(1, 1, 1, 0, "sqrt").hits == [] and solve(1, 1, 1, 5, "sqrt").value == 3
    assert solve(1, -1, 0, 0, "log").value == 0 and not solve(1, -1, 0, -1, "log").in_domain


def test_only_the_sideways_parabola_fails_the_test():
    for family in FAMILIES:
        assert solve(1, 0, 0, 1, family).is_function == (family != "sideways")
    s = solve(1, -2, 0, 2, "sideways")
    assert s.hits == [2, -2] and s.value is None and s.equation == "x = y² − 2"


def test_outputs_match_the_rule():
    assert outputs("quadratic", 2, 1, -3, 4) == [15]
    assert math.isclose(outputs("log", 1, 0, 0, math.e)[0], 1)


@pytest.mark.parametrize("args, text", [
    ((1, 2, 0, "linear"), "f(x) = x − 2"),
    ((-2, -1, 3, "quadratic"), "f(x) = −2(x + 1)² + 3"),
    ((0.5, 0, -1, "sqrt"), "f(x) = 0.5√x − 1"),
    ((2, 1, 0, "log"), "f(x) = 2 ln(x − 1)"),
    ((-1, 0, 2, "log"), "f(x) = −ln x + 2"),
    ((-1, 4, 1, "sideways"), "x = −(y − 1)² + 4"),
])
def test_equation_text(args, text):
    a, h, k, family = args
    assert solve(a, h, k, 0, family).equation == text


def test_window_frames_the_key_points():
    s = solve(1, -2, 0, 2, "sideways")
    for x, y in [[s.h, s.k]] + [[s.x0, y] for y in s.hits]:
        assert s.window.x_min <= x <= s.window.x_max and s.window.y_min <= y <= s.window.y_max


def test_bad_input():
    with pytest.raises(ValueError):
        solve(0, 1, 1, 1)
    with pytest.raises(ValueError):
        solve(1, 1, 1, 1, "cubic")
