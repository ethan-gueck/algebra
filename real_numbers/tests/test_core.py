from fractions import Fraction

import pytest

from real_numbers.solver import exact_root, exact_text, exponent_rules, order_of_operations, parse_number, percent_change, properties, proportion, radicals, sum_two_ways


@pytest.mark.parametrize("text, value", [("0.1", Fraction(1, 10)), ("-3", Fraction(-3)), ("2/3", Fraction(2, 3)), ("1e-3", Fraction(1, 1000)), (".5", Fraction(1, 2)), ("−2.5", Fraction(-5, 2))])
def test_numbers_are_read_exactly(text, value):
    assert parse_number(text) == value


@pytest.mark.parametrize("bad", ["", "abc", "1/0", "1..2"])
def test_bad_numbers_are_rejected(bad):
    with pytest.raises(ValueError):
        parse_number(bad)


@pytest.mark.parametrize("value, text", [(Fraction(3, 5), "0.6"), (Fraction(-5, 2), "−2.5"), (Fraction(1, 3), "1/3"), (Fraction(7), "7"), (Fraction(1, 1000), "0.001")])
def test_exact_text(value, text):
    assert exact_text(value) == text


def test_associativity_holds_exactly_but_not_in_floating_point():
    rows = {r["id"]: r for r in properties("0.1", "0.2", "0.3")}
    assoc = rows["associative_add"]
    assert assoc["exact"] == ["0.6", "0.6"] and assoc["exact_holds"]
    assert assoc["float"] == [0.6000000000000001, 0.6] and not assoc["float_holds"]
    assert rows["commutative_add"]["float_holds"]  # swapping two numbers is always safe


def test_absorption_makes_both_sides_agree_but_wrong():
    assoc = {r["id"]: r for r in properties("1e16", "1", "-1e16")}["associative_add"]
    assert assoc["exact"] == ["1", "1"] and assoc["float"][0] == 0.0 and assoc["exact_float"] == [1.0, 1.0]


def test_zero_has_no_reciprocal():
    inverse = {r["id"]: r for r in properties("0", "1", "2")}["inverse_mul"]
    assert inverse["applies"] is False


def test_pemdas_order():
    r = order_of_operations("3 + 4 × 2 ÷ (1 − 5)^2")
    assert [s["work"] for s in r["steps"]] == ["1 − 5 = −4", "(−4)^2 = 16", "4 × 2 = 8", "8 ÷ 16 = 0.5", "3 + 0.5 = 3.5"]
    assert r["steps"][0]["parentheses"] and r["result"] == "3.5"


def test_multiplication_before_any_addition():
    rules = [s["rule"] for s in order_of_operations("2 + 3 × 4 − 5 × 6")["steps"]]
    assert rules == ["Multiplication", "Multiplication", "Addition", "Subtraction"]


@pytest.mark.parametrize("expr, result", [("-2^2", "−4"), ("(-2)^2", "4"), ("2^3^2", "512"), ("8 ÷ 4 × 2", "4"), ("2(3 + 4)", "14"), ("1/3 + 1/6", "0.5"), ("2^-2", "0.25"), ("7", "7")])
def test_results(expr, result):
    assert order_of_operations(expr)["result"] == result


def test_exact_and_float_answers_can_differ():
    r = order_of_operations("0.1 + 0.2 − 0.3")
    assert r["result"] == "0" and r["value"] == pytest.approx(5.551115123125783e-17, rel=1e-12)


@pytest.mark.parametrize("bad", ["1 ÷ 0", "2^0.5", "(1 + 2", "3 +", "4 $ 2", "0^-1"])
def test_bad_expressions_explain_themselves(bad):
    with pytest.raises(ValueError):
        order_of_operations(bad)


def test_grouping_puts_the_sun_below_the_horizon():
    r = sum_two_ways("0.1", "0.3", "-0.4")
    assert r["exact"] == "0" and r["left"] == 0.0 and r["right"] < 0
    assert r["altitude"]["right"] < 0 and r["guarded"]["right"] == 0.0


def test_grouping_can_leave_arcsin_without_an_answer():
    r = sum_two_ways("0.1", "0.34", "0.56")
    assert r["exact"] == "1" and r["right"] > 1 and r["altitude"]["right"] is None
    assert r["guarded"]["right"] == 90.0


def test_solar_altitude_formula():
    import math

    from core import formula

    # Sun on the celestial equator at noon, seen from the equator: straight overhead.
    assert formula.solar_altitude(formula.sine_of_solar_altitude(0.0, 0.0, 0.0)) == pytest.approx(90)
    # Six hours from noon on the equinox: on the horizon.
    assert formula.solar_altitude(formula.sine_of_solar_altitude(math.radians(40), 0.0, math.pi / 2)) == pytest.approx(0, abs=1e-9)


# ---- Exponent rules (A1.2) ----

def test_exponent_rules_hold_exactly_but_not_always_in_floating_point():
    rows = {r["id"]: r for r in exponent_rules("0.1", "2", "5")}
    assert all(r["exact_holds"] for r in rows.values())
    product = rows["product"]
    assert product["left"] == "0.1^2 × 0.1^5" and product["right"] == "0.1^7" and product["exact"] == ["0.0000001", "0.0000001"]
    assert not product["float_holds"] and rows["quotient"]["float_holds"]


def test_exponent_rule_text_and_values():
    rows = {r["id"]: r for r in exponent_rules("-2", "-3", "2")}
    assert rows["power"]["left"] == "((−2)^2)^(−3)" and rows["power"]["right"] == "(−2)^(−6)" and rows["power"]["exact"] == ["0.015625", "0.015625"]
    assert rows["negative"]["left"] == "(−2)^3" and rows["negative"]["exact"] == ["−8", "−8"]
    assert rows["quotient"]["right"] == "(−2)^(−5)"


def test_base_zero_skips_the_rules_that_divide_by_it():
    rows = {r["id"]: r for r in exponent_rules("0", "2", "3")}
    assert rows["product"]["applies"] and rows["power"]["applies"]
    assert not rows["quotient"]["applies"] and not rows["negative"]["applies"]
    assert rows["zero"]["note"] == "Needs a ≠ 0: 0⁰ is undefined."


def test_exponent_formulas_are_exact_on_fractions_and_can_fail_on_floats():
    from core import formula

    assert formula.term_multiplication_exponent(Fraction(3), -4, -4) and not formula.term_multiplication_exponent(3, -4, -4)
    assert formula.term_division_with_exponent(Fraction(1, 3), 5, -2) and formula.term_with_negative_exponent(Fraction(7), 3)
    assert formula.term_with_exponent_raised_by_exponent(2, 3, 4) and formula.term_with_exponent_equal_to_zero(5)


@pytest.mark.parametrize("bad", [("2", "1.5", "1"), ("2", "21", "1"), ("1e16", "20", "20"), ("x", "1", "1")])
def test_bad_exponent_inputs_are_rejected(bad):
    with pytest.raises(ValueError):
        exponent_rules(*bad)


# ---- Radicals and rational exponents (A1.3) ----

@pytest.mark.parametrize("x, k, root", [(Fraction(64), 3, Fraction(4)), (Fraction(1, 4), 2, Fraction(1, 2)), (Fraction(2), 2, None), (Fraction(0), 5, Fraction(0)), (Fraction(3**60), 20, Fraction(27))])
def test_exact_roots_are_fractions_or_none(x, k, root):
    assert exact_root(x, k) == root


def test_rational_exponent_is_exact_but_float_sides_differ():
    rows = {r["id"]: r for r in radicals("8", "18", "2", "3")}
    rational = rows["rational"]
    assert rational["sides"] == ["8^(2/3)", "³√(8^2)", "(³√8)^2"] and rational["exact"] == "4"
    assert rational["float"] == [3.9999999999999996, 3.9999999999999996, 4.0]
    assert not rational["float_equal"] and rational["holds"]  # == fails, math.isclose holds


def test_product_of_irrational_roots_can_be_rational():
    product = {r["id"]: r for r in radicals("2", "8", "1", "2")}["product"]
    assert product["sides"] == ["√(2 × 8)", "√2 × √8"] and product["exact"] == "4"
    assert product["float"] == [4.0, 4.000000000000001] and not product["float_equal"] and product["holds"]
    assert {r["id"]: r for r in radicals("2", "3", "1", "2")}["product"]["exact"] is None  # √6 is irrational


def test_radicals_need_non_negative_bases():
    rows = {r["id"]: r for r in radicals("-4", "-9", "1", "2")}
    assert not rows["rational"]["applies"] and not rows["product"]["applies"]
    assert not {r["id"]: r for r in radicals("0", "1", "-1", "2")}["rational"]["applies"]


def test_radical_formulas():
    from core import formula

    assert formula.term_with_exponent_divided_by_exponent(8, 2, 3) and not 8 ** (2 / 3) == 4  # why the formula uses isclose
    assert formula.root_term_multiplication(2, 8) and formula.root_term_multiplication(0, 5)


@pytest.mark.parametrize("bad", [("8", "1", "2", "0"), ("8", "1", "2", "-3"), ("8", "1", "1.5", "2"), ("1e16", "1", "20", "2")])
def test_bad_radical_inputs_are_rejected(bad):
    with pytest.raises(ValueError):
        radicals(*bad)


# ---- Ratios, proportions and percent change (A1.14) ----

def test_proportion_holds_exactly_but_float_division_disagrees():
    r = proportion("0.1", "0.3", "1", "3")
    assert r["simplest"] == ["1 : 3", "1 : 3"] and r["exact"] == ["1/3", "1/3"] and r["exact_holds"]
    assert r["cross"] == ["0.3", "0.3"] and not r["float_holds"]


def test_ratios_not_in_proportion():
    r = proportion("3", "4", "4", "5")
    assert not r["exact_holds"] and not r["float_holds"] and r["cross"] == ["15", "16"]
    assert proportion("-1", "2", "0.5", "-1")["simplest"] == ["−1 : 2", "−1 : 2"]


def test_percent_change_and_its_undo():
    r = percent_change("80", "120")
    assert r["exact"] == "50" and r["direction"] == "increase" and r["undo"] == "−100/3"
    assert percent_change("50", "0")["undo"] is None and percent_change("2", "2")["direction"] == "no change"
    assert percent_change("0.1", "0.3")["float"] == 199.99999999999997


@pytest.mark.parametrize("call", [lambda: proportion("1", "0", "2", "3"), lambda: percent_change("0", "5")])
def test_dividing_by_zero_is_rejected(call):
    with pytest.raises(ValueError):
        call()
