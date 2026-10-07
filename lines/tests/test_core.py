import pytest

from core import formula
from lines.solver import solve, standard_whole_numbers


@pytest.mark.parametrize("x1, y1, m", [(1, 3, 2), (0, 4, -0.5), (-2, 3, 0), (0, 0, 1.5), (2, -1, 0.75), (-3.5, 2.25, -1.25)])
def test_the_three_forms_give_the_same_y(x1, y1, m):
    b = formula.y_intercept(m, x1, y1)
    A, B, C = formula.standard_coefficients(m, b)
    for x in (-4.0, -1.0, 0.0, 0.5, 3.0):
        y = formula.linear_form(b, x, m=m)
        assert formula.point_form_slope(x1, y1, m, x) == pytest.approx(y)
        assert formula.standard_form_for_linear_form(A, B, C, x) == pytest.approx(y)
        assert A * x + B * y == pytest.approx(C)  # the point really is on Ax + By = C


def test_standard_form_solves_for_y():
    # 2x - y = -1 is y = 2x + 1: at x = 2, y = 5 (not A·x − C = 5's negation).
    assert formula.standard_form_for_linear_form(2, -1, -1, 2) == 5


def test_intercepts():
    assert formula.y_intercept(2, 1, 3) == 1 and formula.x_intercept_of_linear_form(2, 1) == -0.5


@pytest.mark.parametrize("m, b, abc", [(2, 1, (2, -1, -1)), (-0.5, 4, (1, 2, 8)), (0, 3, (0, 1, 3)), (0.75, -2.5, (3, -4, 10)), (1.5, 0, (3, -2, 0))])
def test_standard_form_uses_whole_numbers_with_a_non_negative(m, b, abc):
    assert standard_whole_numbers(m, b) == abc


def test_forms_as_text():
    s = solve(2, -1, 0.75)
    assert s.slope_intercept_form == "y = 0.75x - 2.5"
    assert s.point_slope_form == "y + 1 = 0.75(x - 2)"
    assert s.standard_form == "3x - 4y = 10"
    assert solve(-2, 3, 0).slope_intercept_form == "y = 3" and solve(-2, 3, 0).x_intercept is None


def test_table_rows_agree():
    for row in solve(2, -1, 0.75).table:
        assert row["slope_intercept"] == row["point_slope"] == row["standard"]


def test_linear_inequality_rules():
    # a > b ⇔ a + c > b + c; multiplying by c > 0 keeps the sign, c < 0 flips it.
    for a, b in ((5, 2), (2, 5), (-1, -4), (3, 3)):
        for c in (1, 0.5, -3, -0.25):
            assert formula.linear_inequality(a, b, c)


@pytest.mark.parametrize("case, slope_intercept, standard, shade, dashed", [
    ((1, 3, 2, ">"), "y > 2x + 1", "2x - y < -1", "above", True),
    ((2, -1, 0.75, "≤"), "y ≤ 0.75x - 2.5", "3x - 4y ≥ 10", "below", False),
    ((-2, 3, 0, "≥"), "y ≥ 3", "y ≥ 3", "above", False),
    ((0, 0, 1.5, "<"), "y < 1.5x", "3x - 2y > 0", "below", True),
])
def test_inequality_forms_and_shading(case, slope_intercept, standard, shade, dashed):
    ineq = solve(*case).inequality
    assert (ineq["slope_intercept_form"], ineq["standard_form"], ineq["shade"], ineq["dashed"]) == (slope_intercept, standard, shade, dashed)


@pytest.mark.parametrize("case", [(1, 3, 2, ">"), (2, -1, 0.75, "≤"), (0, 0, 1.5, "<"), (0, 4, -0.5, "≥"), (-2, 3, 0, "<")])
def test_test_point_is_on_the_shaded_side(case):
    s = solve(*case)
    x0, y0 = s.inequality["test_point"]
    on_line = formula.linear_form(s.b, x0, m=s.m)
    assert y0 != on_line  # off the line
    assert s.inequality["test_holds"] == ((y0 > on_line) == (s.inequality["shade"] == "above"))


def test_equals_has_no_inequality():
    assert solve(1, 3, 2).inequality is None
    with pytest.raises(ValueError):
        solve(1, 3, 2, "!=")


def test_linear_form_finds_the_slope_from_two_points():
    # (1, 3) and (3, 7): m = (7 − 3) / (3 − 1) = 2, so with b = 1, y(5) = 11.
    assert formula.linear_form(1, 5, y2=7, y1=3, x2=3, x1=1) == 11
