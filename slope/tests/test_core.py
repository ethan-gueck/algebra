import math

import pytest

from slope.solver import classify, rise, run, slope, solve, standard_form, x_intercept, y_intercept


@pytest.mark.parametrize(
    "points, m, kind",
    [((1, 1, 4, 3), 0.6666666667, "positive"), ((-2, 4, 3, -1), -1.0, "negative"), ((-3, 2, 4, 2), 0.0, "zero"), ((2, -3, 2, 4), None, "undefined")],
)
def test_slope_and_kind(points, m, kind):
    assert slope(*points) == m and classify(slope(*points)) == kind


def test_rise_and_run():
    assert rise(1, 1, 4, 3) == 2 and run(1, 1, 4, 3) == 3


def test_order_of_points_does_not_matter():
    assert solve(1, 1, 4, 3).slope == solve(4, 3, 1, 1).slope


def test_same_point_is_rejected():
    with pytest.raises(ValueError):
        slope(2, 2, 2, 2)


def test_intercepts_come_straight_from_the_points():
    # Using an already-rounded m here would give -0.4999999999.
    assert x_intercept(1, 1, 4, 3) == -0.5 and y_intercept(1, 1, 4, 3) == 0.3333333333
    assert y_intercept(2, -3, 2, 4) is None and x_intercept(2, -3, 2, 4) == 2
    assert x_intercept(-3, 2, 4, 2) is None


def test_angle_matches_atan_of_the_slope():
    s = solve(0, 0, 1, math.sqrt(3))
    assert s.angle == pytest.approx(60) and solve(2, 0, 2, 5).angle == 90


@pytest.mark.parametrize(
    "points, expected",
    [((1, 1, 4, 3), "2x - 3y = -1"), ((-2, 4, 3, -1), "x + y = 2"), ((-3, 2, 4, 2), "y = 2"), ((2, -3, 2, 4), "x = 2"), ((0.5, 1.5, 2, -0.25), "14x + 12y = 25")],
)
def test_standard_form_uses_whole_numbers(points, expected):
    assert standard_form(*points) == expected


def test_forms():
    s = solve(-2, 4, 3, -1)
    assert s.slope_intercept_form == "y = -x + 2" and s.point_slope_form == "y - 4 = -(x + 2)"
    assert solve(2, -3, 2, 4).slope_intercept_form == "x = 2"


def test_window_frames_both_points():
    s = solve(1, 1, 4, 3)
    w = s.window
    assert w.x_min <= 1 and w.x_max >= 4 and w.y_min <= 1 and w.y_max >= 3


def test_the_three_forms_describe_the_same_line():
    from core import formula

    x1, y1, x2, y2 = 0.5, 1.5, 2, -0.25
    m = formula.slope(x1, y1, x2, y2)
    b = formula.y_intercept(m, x1, y1)
    A, B, C = formula.standard_form(x1, y1, x2, y2)
    for x in (-2.0, 0.0, 1.0, 3.5):
        y = formula.slope_intercept_form(m, b, x)
        assert formula.point_slope_form(m, x1, y1, x) == pytest.approx(y)
        assert A * x + B * y == pytest.approx(C)
    assert formula.slope_intercept_form(m, b, formula.x_intercept(m, x1, y1)) == pytest.approx(0, abs=1e-12)
