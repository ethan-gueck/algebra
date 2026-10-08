import math

import pytest

from core import formula
from parallel.solver import solve


def test_slopes_given_directly():
    assert formula.is_parallel(2, 2) and not formula.is_parallel(2, 3)
    assert formula.is_perpendicular(2, -0.5) and formula.is_perpendicular(3, -1 / 3) and not formula.is_perpendicular(2, 0.5)


def test_slopes_from_points_call_slope():
    # Line 1 through (0, 1), (1, 3): m = 2. Line 2 through (0, -3), (2, 1): m = 2.
    assert formula.is_parallel(x1=0, y1=1, x2=1, y2=3, x3=0, y3=-3, x4=2, y4=1)
    # Line 2 through (0, 3), (4, 1): m = -0.5, and 2 · (-0.5) = -1.
    assert formula.is_perpendicular(x1=0, y1=1, x2=2, y2=5, x3=0, y3=3, x4=4, y4=1)
    # A slope for one line and points for the other.
    assert formula.is_perpendicular(m1=2, x3=0, y3=0, x4=2, y4=-1)


def test_float_slopes_compare_with_tolerance():
    # 0.1 / 0.3 = 0.33333333333333337 but 1 / 3 = 0.3333333333333333: exact == would call these different.
    assert formula.slope(0, 0, 0.3, 0.1) != formula.slope(0, 0, 3, 1)
    assert formula.is_parallel(x1=0, y1=0, x2=0.3, y2=0.1, x3=0, y3=1, x4=3, y4=2)


def test_vertical_lines():
    assert formula.is_parallel(x1=1, y1=0, x2=1, y2=5, x3=4, y3=1, x4=4, y4=9)          # both vertical
    assert formula.is_perpendicular(x1=2, y1=0, x2=2, y2=3, x3=0, y3=1, x4=5, y4=1)     # vertical and horizontal
    assert not formula.is_parallel(math.inf, 1) and not formula.is_perpendicular(math.inf, 1)


@pytest.mark.parametrize("points, relation", [
    ((0, 1, 2, 5, 0, 3, 4, 1), "perpendicular"),
    ((0, 1, 1, 3, 0, -3, 2, 1), "parallel"),
    ((0, 0, 2, 1, 0, 4, 3, 1), "neither"),
    ((2, -2, 2, 4, -3, 1, 4, 1), "perpendicular"),
    ((-1, -2, -1, 3, 3, -1, 3, 4), "parallel"),
    ((0, 1, 1, 3, 2, 5, 3, 7), "same line"),
])
def test_relation(points, relation):
    assert solve(*points).relation == relation


def test_equations_and_crossing():
    s = solve(0, 1, 2, 5, 0, 3, 4, 1)
    assert (s.line1["equation"], s.line2["equation"]) == ("y = 2x + 1", "y = -0.5x + 3")
    assert s.product == -1 and s.angle_between == 90 and s.crossing == [0.8, 2.6]
    v = solve(2, -2, 2, 4, -3, 1, 4, 1)
    assert v.line1["equation"] == "x = 2" and v.line1["m"] is None and v.product is None and v.crossing == [2, 1]
    assert solve(0, 1, 1, 3, 0, -3, 2, 1).crossing is None


def test_window_frames_every_point():
    s = solve(0, 1, 2, 5, 0, 3, 4, 1)
    for x, y in s.points + [s.crossing]:
        assert s.window.x_min <= x <= s.window.x_max and s.window.y_min <= y <= s.window.y_max


def test_a_line_needs_two_points():
    with pytest.raises(ValueError):
        solve(1, 1, 1, 1, 0, 0, 1, 1)
