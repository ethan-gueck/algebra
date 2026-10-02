from fractions import Fraction

import pytest

from real_numbers.solver import exact_text, order_of_operations, parse_number, properties, sum_two_ways


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
