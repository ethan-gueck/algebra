import pytest

from core import formula
from factoring.solver import solve, special_products_table, to_standard

CASES = [("standard", 1, -3, 2), ("standard", 2, 1, -6), ("standard", -2, 4, 6), ("standard", 1, 6, 9), ("standard", 1, -2, -1),
         ("standard", 1, 2, 5), ("standard", 3, -6, 0), ("vertex", 1, 1.5, -0.25), ("vertex", 2, -1, 3), ("factored", -1, -2, 3), ("factored", 0.5, 1.5, 1.5)]


@pytest.mark.parametrize("a, b, c", [(1, -3, 2), (2, 1, -6), (-1, 2, 3), (0.5, -1, -4), (3, 0, -12)])
def test_conversions_describe_the_same_parabola(a, b, c):
    _, h, k = formula.convert_standard_form_to_vertex_form(a, b, c)
    _, r1, r2 = formula.convert_standard_form_to_factored_form(a, b, c)
    for x in (-3.0, -0.5, 0.0, 1.25, 4.0):
        y = formula.parabola(a, b, c, x)
        assert formula.vertex_form(a, h, k, x) == pytest.approx(y)
        assert formula.factored_form(a, r1, r2, x) == pytest.approx(y)
    assert formula.convert_vertex_form_to_standard_form(a, h, k) == pytest.approx((a, b, c))
    assert formula.convert_factored_form_to_standard_form(a, r1, r2) == pytest.approx((a, b, c))
    assert formula.convert_factored_form_to_vertex_form(a, r1, r2) == pytest.approx((a, h, k))
    assert sorted(formula.convert_vertex_form_to_factored_form(a, h, k)[1:]) == pytest.approx(sorted((r1, r2)))


def test_vertex_to_factored_uses_minus_k_over_a():
    # y = (x − 1.5)² − 0.25 crosses the x-axis at 1 and 2 (−k/a = 0.25 ≥ 0).
    assert sorted(formula.convert_vertex_form_to_factored_form(1, 1.5, -0.25)[1:]) == [1, 2]
    with pytest.raises(ValueError):
        formula.convert_vertex_form_to_factored_form(2, -1, 3)  # −k/a < 0: no real roots


def test_ac_method_numbers():
    m, n = formula.ac_method(2, 1, -6)
    assert m * n == 2 * -6 and m + n == 1


@pytest.mark.parametrize("case", CASES)
def test_every_form_text_is_the_same_parabola(case):
    s = solve(*case)
    a, b, c = to_standard(*case)
    assert (s.standard["a"], s.standard["b"], s.standard["c"]) == (a, b, c)
    assert formula.vertex_form(a, s.vertex["h"], s.vertex["k"], 0.7) == pytest.approx(formula.parabola(a, b, c, 0.7))
    if s.factored:
        assert formula.factored_form(a, s.factored["r1"], s.factored["r2"], 0.7) == pytest.approx(formula.parabola(a, b, c, 0.7))
    assert len(s.conversions) == 2 and {conv["to"] for conv in s.conversions} == {"standard", "vertex", "factored"} - {case[0]}


@pytest.mark.parametrize("case, verdict, result", [
    (("standard", 2, 1, -6), "Yes: it factors over the integers.", "y = (x + 2)(2x - 3)"),
    (("standard", -2, 4, 6), "Yes: it factors over the integers.", "y = -2(x + 1)(x - 3)"),
    (("standard", 1, 6, 9), "Yes: it's a perfect square.", "y = (x + 3)²"),
    (("standard", 3, -6, 0), "Yes: it factors over the integers.", "y = 3x(x - 2)"),
    (("standard", 1, -2, -1), "Yes, over the real numbers, but not over the integers.", "y = (x + 0.4142)(x - 2.414)"),
    (("standard", 1, 2, 5), "No: it can't be factored over the real numbers.", None),
    (("vertex", 2, -1, 3), "No: it can't be factored over the real numbers.", None),
])
def test_discriminant_decides_whether_it_factors(case, verdict, result):
    s = solve(*case)
    assert s.factorable["verdict"] == verdict and s.factored_result == result


def test_ac_method_steps():
    steps = [step["math"] for step in solve("standard", 2, 1, -6).factoring]
    assert "m = 4, n = -3" in steps[1]
    assert steps[2] == "2x² + 4x - 3x - 6"
    assert steps[3] == "2x(x + 2) - 3(x + 2)"


def test_a_must_be_non_zero():
    with pytest.raises(ValueError):
        solve("standard", 0, 1, 2)


# ---- Special products (A1.9) ----

@pytest.mark.parametrize("a, b", [(3, 2), (-4, 7), (0, 5), (0.1, 0.3), (1, 1.0000001), (2.5, -0.5)])
def test_special_product_formulas_hold(a, b):
    assert formula.polynomial_products(a, b) and formula.special_products(a, b)


def test_isclose_needs_an_absolute_tolerance_when_a_is_close_to_b():
    import math

    a, b = 4.517, 4.517000001  # (a − b)² ≈ 1e-18, but a² − 2ab + b² keeps ≈ 1e-14 of rounding error
    assert not math.isclose((a - b) ** 2, a ** 2 - 2 * a * b + b ** 2) and formula.polynomial_products(a, b)


def test_special_products_table_shows_where_equality_fails():
    table = special_products_table(0.1, 0.3)
    rows = {r["id"]: r for r in table["rows"]}
    assert rows["square_sum"]["left"] == "(0.1 + 0.3)²" and rows["square_sum"]["right"] == "0.1² + 2·0.1·0.3 + 0.3²"
    assert all(not r["equal"] and r["holds"] for r in rows.values())  # == fails on every row, math.isclose holds
    assert rows["difference_of_squares"]["left"] == "(0.1 + 0.3)(0.1 − 0.3)"


def test_patterns_become_quadratics_that_factor_back():
    table = special_products_table(2, -3)
    assert [(t["product"], t["expanded"]) for t in table["patterns"]] == [
        ("(2x - 3)²", "4x² - 12x + 9"), ("(2x + 3)²", "4x² + 12x + 9"), ("(2x - 3)(2x + 3)", "4x² - 9")]
    assert solve("standard", *table["patterns"][0]["standard"]).factored_result == "y = (2x - 3)²"
    assert solve("standard", *table["patterns"][2]["standard"]).factored_result == "y = (2x + 3)(2x - 3)"
    assert special_products_table(0, 5)["patterns"] == []
