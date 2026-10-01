import pytest

from a1.core import (
    discriminant,
    evaluate,
    factored_form_text,
    intercept_points,
    root_nature,
    roots,
    solve,
    solve_linear,
    standard_form_text,
    vertex_form_text,
    vertex_point,
)


@pytest.mark.parametrize(
    "a, b, c, expected",
    [
        (1, -3, 2, (1, 2)),
        (2, 4, -6, (-3, 1)),
        (-1, 0, 4, (-2, 2)),
        (1, -2, 1, (1, 1)),
    ],
)
def test_real_roots(a, b, c, expected):
    r1, r2 = roots(a, b, c)
    assert (r1.real, r2.real) == expected
    assert r1.imag == r2.imag == 0
    for r in (r1, r2):
        assert evaluate(a, b, c, r.real) == pytest.approx(0, abs=1e-9)


def test_complex_roots_are_conjugates():
    r1, r2 = roots(1, 2, 5)
    assert r1 == complex(-1, -2)
    assert r2 == complex(-1, 2)
    assert intercept_points(1, 2, 5) == []


def test_stable_formula_avoids_cancellation():
    # Naive (-b + sqrt(b² - 4ac)) / 2a returns 0.0 for the small root here.
    small, large = sorted(roots(1, 1e8, 1), key=lambda r: abs(r.real))
    assert small.real == pytest.approx(-1e-8, rel=1e-9)
    assert large.real == pytest.approx(-1e8, rel=1e-9)


def test_discriminant_and_nature():
    assert discriminant(1, -3, 2) == 1
    assert root_nature(1, -3, 2) == "two distinct real roots"
    assert root_nature(1, -2, 1) == "one repeated real root"
    assert root_nature(1, 2, 5) == "two complex conjugate roots"
    assert root_nature(0.1, 0.2, 0.1) == "one repeated real root"  # float noise tolerated


def test_vertex_and_intercepts():
    assert vertex_point(1, -3, 2) == (1.5, -0.25)
    assert intercept_points(1, -2, 1) == [(1.0, 0.0)]
    sol = solve(-2, 4, 6)
    assert sol.y_intercept == (0.0, 6)
    assert sol.axis_of_symmetry == 1
    assert sol.direction == "down"


@pytest.mark.parametrize(
    "abc, standard, vertex_f, factored",
    [
        ((1, -3, 2), "y = x² - 3x + 2", "y = (x - 1.5)² - 0.25", "y = (x - 1)(x - 2)"),
        ((1, -2, 1), "y = x² - 2x + 1", "y = (x - 1)²", "y = (x - 1)²"),
        ((-1, 1, 0), "y = -x² + x", "y = -(x - 0.5)² + 0.25", "y = -x(x - 1)"),
        ((0.5, 0, -8), "y = 0.5x² - 8", "y = 0.5x² - 8", "y = 0.5(x + 4)(x - 4)"),
        ((1, 2, 5), "y = x² + 2x + 5", "y = (x + 1)² + 4", None),
    ],
)
def test_forms(abc, standard, vertex_f, factored):
    assert standard_form_text(*abc) == standard
    assert vertex_form_text(*abc) == vertex_f
    assert factored_form_text(*abc) == factored


def test_a_zero_rejected():
    with pytest.raises(ValueError):
        solve(0, 2, 1)


@pytest.mark.parametrize("abc", [(1, -3, 2), (1, 2, 5), (-2, 4, 6), (0.2, 3, -40)])
def test_window_frames_key_points(abc):
    sol = solve(*abc)
    w = sol.window
    points = [sol.vertex, sol.y_intercept, *sol.x_intercepts]
    for x, y in points:
        assert w.x_min <= x <= w.x_max and w.y_min <= y <= w.y_max
    # The whole curve over the x-range fits vertically.
    for i in range(51):
        x = w.x_min + (w.x_max - w.x_min) * i / 50
        assert w.y_min <= evaluate(*abc, x) <= w.y_max


def test_to_dict_is_json_safe():
    import json

    data = solve(1, 2, 5).to_dict()
    assert json.loads(json.dumps(data))["roots"] == [{"re": -1.0, "im": -2.0}, {"re": -1.0, "im": 2.0}]


@pytest.mark.parametrize(
    "b, c, root, form",
    [(-3, 2, 0.6666666667, "y = -3x + 2"), (1, -4, 4, "y = x - 4"), (0, 5, None, "y = 5"), (0, 0, None, "y = 0")],
)
def test_solve_linear(b, c, root, form):
    line = solve_linear(b, c)
    assert line["root"] == root and line["standard_form"] == form
    assert line["y_intercept"] == [0.0, c]


def test_small_a_root_tends_to_linear_root():
    # As a → 0 the finite root of ax² + bx + c approaches the line's root -c/b.
    near = min(roots(1e-6, -3, 2), key=lambda r: abs(r.real))
    assert near.real == pytest.approx(solve_linear(-3, 2)["root"], rel=1e-5)


@pytest.mark.parametrize("abc", [(1, -3, 2), (2, 4, -6), (-0.5, 1, 3)])
def test_the_three_forms_describe_the_same_parabola(abc):
    from a1.core import formula

    a, b, c = abc
    h, k = formula.vertex(a, b, c)
    r1, r2 = formula.quadratic_formula(a, b, c)
    for x in (-3.0, -0.5, 0.0, 1.25, 4.0):
        y = formula.parabola(a, b, c, x)
        assert formula.vertex_form(a, h, k, x) == pytest.approx(y)
        assert abs(formula.factored_form(a, r1, r2, x) - y) < 1e-9


def test_formula_intercepts_match_the_solver():
    from a1.core import formula

    assert formula.x_intercepts(1, -3, 2) == [1.0, 2.0] and formula.x_intercepts(1, 2, 5) == []
    assert formula.y_intercept(1, -3, 2) == (0, 2)
