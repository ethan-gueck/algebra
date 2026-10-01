import pytest

from lines.core import formula
from lines.core import solve, standard_whole_numbers


@pytest.mark.parametrize("x1, y1, m", [(1, 3, 2), (0, 4, -0.5), (-2, 3, 0), (0, 0, 1.5), (2, -1, 0.75), (-3.5, 2.25, -1.25)])
def test_the_three_forms_give_the_same_y(x1, y1, m):
    b = formula.y_intercept(x1, y1, m)
    A, B, C = formula.standard_coefficients(m, b)
    for x in (-4.0, -1.0, 0.0, 0.5, 3.0):
        y = formula.linear_form(m, b, x)
        assert formula.point_form_slope(x1, y1, m, x) == pytest.approx(y)
        assert formula.standard_form_for_linear_form(A, B, C, x) == pytest.approx(y)
        assert A * x + B * y == pytest.approx(C)  # the point really is on Ax + By = C


def test_standard_form_solves_for_y():
    # 2x - y = -1 is y = 2x + 1: at x = 2, y = 5 (not A·x − C = 5's negation).
    assert formula.standard_form_for_linear_form(2, -1, -1, 2) == 5


def test_intercepts():
    assert formula.y_intercept(1, 3, 2) == 1 and formula.x_intercept(2, 1) == -0.5


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
