import pytest

from core import formula
from variation.solver import solve


def test_direct_variation_keeps_the_ratio():
    # y = 3x: y / x = 3 at every x ≠ 0, and doubling x doubles y.
    for x in (-2, 0.5, 1, 4):
        assert formula.direct_variation(3, x) / x == pytest.approx(3)
    assert formula.direct_variation(3, 4) == 2 * formula.direct_variation(3, 2)


def test_inverse_variation_keeps_the_product():
    # y = 12 / x: xy = 12 at every x ≠ 0, and doubling x halves y.
    for x in (-3, 0.5, 2, 6):
        assert x * formula.indirect_variation(12, x) == pytest.approx(12)
    assert formula.indirect_variation(12, 4) == formula.indirect_variation(12, 2) / 2


@pytest.mark.parametrize("case, k, y2, equation", [
    ((2, 6, 4, "direct"), 3, 12, "y = 3x"),
    ((2, -3, 4, "direct"), -1.5, -6, "y = -1.5x"),
    ((1, 1, 5, "direct"), 1, 5, "y = x"),
    ((2, 6, 4, "inverse"), 12, 3, "y = 12 / x"),
    ((-3, 4, 6, "inverse"), -12, -2, "y = -12 / x"),
    ((40, 3, 60, "inverse"), 120, 2, "y = 120 / x"),
])
def test_k_from_the_known_point_predicts_y2(case, k, y2, equation):
    s = solve(*case)
    assert (s.k, s.y2, s.equation) == (k, y2, equation)


def test_scale_factor_is_the_same_or_the_reciprocal():
    d, i = solve(2, 6, 4, "direct"), solve(2, 6, 4, "inverse")
    assert d.x_scale == d.y_scale == 2
    assert i.x_scale == 2 and i.y_scale == 0.5


@pytest.mark.parametrize("kind", ["direct", "inverse"])
def test_table_invariant_is_k_on_every_row(kind):
    s = solve(2, 6, 4, kind)
    assert {row["invariant"] for row in s.table} == {s.k}


def test_window_frames_origin_and_both_points():
    for case in ((2, 6, 4, "direct"), (-3, 4, 6, "inverse"), (40, 3, 60, "inverse")):
        s, w = solve(*case), solve(*case).window
        for x, y in ((0, 0), (s.x1, s.y1), (s.x2, s.y2)):
            assert w.x_min <= x <= w.x_max and w.y_min <= y <= w.y_max


@pytest.mark.parametrize("case", [(0, 3, 2, "direct"), (2, 0, 3, "inverse"), (2, 6, 0, "inverse"), (2, 6, 4, "joint")])
def test_undefined_cases_raise(case):
    with pytest.raises(ValueError):
        solve(*case)


def test_direct_allows_x2_zero():
    assert solve(2, 6, 0, "direct").y2 == 0
