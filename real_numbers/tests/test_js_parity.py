"""The browser module (html/static/real_numbers_math.js) must match solver.py exactly."""

import json

import pytest

from general.jsrun import AVAILABLE, assert_close, run_js
from real_numbers.api import TOPIC
from real_numbers.solver import exponent_rules, order_of_operations, percent_change, properties, proportion, sum_two_ways

MODULE = TOPIC.modules[0]
G = f"window.{MODULE.global_name}"

pytestmark = pytest.mark.skipif(not AVAILABLE, reason="no JavaScript runtime (node or osascript)")

TRIPLES = [("0.1", "0.2", "0.3"), ("2", "3", "4"), ("1/3", "2/3", "1/7"), ("1e16", "1", "-1e16"), ("0", "-2.5", "7"), ("−0.7", "0.1", "0.8")]
EXPRESSIONS = ["3 + 4 × 2 ÷ (1 − 5)^2", "2 + 3 × 4 − 5 × 6", "−2^2 + (−2)^2", "2^3^2", "2(3 + 4)", "0.1 + 0.2 − 0.3", "1/3 + 1/6", "2^-2", "((2+3))×-4", "1.5 × (2 − 0.25) ÷ 0.5"]
EXPONENTS = [("0.1", "2", "5"), ("3", "-4", "-4"), ("0", "2", "3"), ("-2", "-3", "2"), ("1/3", "5", "-2"), ("0.7", "4", "-2"), ("10", "-12", "5")]
RATIOS = [("0.1", "0.3", "1", "3"), ("3", "4", "4", "5"), ("-1", "2", "0.5", "-1"), ("2/3", "4", "1", "6")]
PERCENTS = [("80", "120"), ("120", "80"), ("0.1", "0.3"), ("50", "0"), ("−4", "2"), ("3", "3")]
SUMS = [("0.1", "0.3", "-0.4"), ("0.1", "0.34", "0.56"), ("0.25", "0.5", "-0.75"), ("0.7", "0.2", "-0.9")]


def _py(value):
    return json.loads(json.dumps(value))


def test_properties_match_python():
    for triple, js in zip(TRIPLES, run_js(list(MODULE.scripts), f"{json.dumps(TRIPLES)}.map(function (t) {{ return {G}.properties(t[0], t[1], t[2]); }})")):
        assert_close(_py(properties(*triple)), js, str(triple), rel=0)


def test_order_of_operations_matches_python():
    for expr, js in zip(EXPRESSIONS, run_js(list(MODULE.scripts), f"{json.dumps(EXPRESSIONS)}.map(function (e) {{ return {G}.order_of_operations(e); }})")):
        assert_close(_py(order_of_operations(expr)), js, expr, rel=0)


def test_sum_two_ways_matches_python():
    for terms, js in zip(SUMS, run_js(list(MODULE.scripts), f"{json.dumps(SUMS)}.map(function (t) {{ return {G}.sum_two_ways(t[0], t[1], t[2]); }})")):
        assert_close(_py(sum_two_ways(*terms)), js, str(terms))


def _match(fn, name, cases):
    calls = f"{json.dumps(cases)}.map(function (t) {{ return {G}.{name}.apply(null, t); }})"
    for case, js in zip(cases, run_js(list(MODULE.scripts), calls)):
        assert_close(_py(fn(*case)), js, str(case), rel=0)


def test_exponent_rules_match_python():
    _match(exponent_rules, "exponent_rules", EXPONENTS)


def test_proportion_and_percent_change_match_python():
    _match(proportion, "proportion", RATIOS)
    _match(percent_change, "percent_change", PERCENTS)


def test_errors_match_python():
    for expr in ["1 ÷ 0", "2^0.5", "(1 + 2"]:
        with pytest.raises(ValueError) as py:
            order_of_operations(expr)
        js = run_js(list(MODULE.scripts), f"(function () {{ try {{ {G}.order_of_operations({json.dumps(expr)}); return null; }} catch (e) {{ return e.message; }} }})()")
        assert js == str(py.value)
    for name, fn, args in [("exponent_rules", exponent_rules, ("2", "1.5", "1")), ("exponent_rules", exponent_rules, ("1e16", "20", "20")),
                           ("proportion", proportion, ("1", "0", "2", "3")), ("percent_change", percent_change, ("0", "5"))]:
        with pytest.raises(ValueError) as py:
            fn(*args)
        js = run_js(list(MODULE.scripts), f"(function () {{ try {{ {G}.{name}.apply(null, {json.dumps(args)}); return null; }} catch (e) {{ return e.message; }} }})()")
        assert js == str(py.value)


def test_every_published_function_exists_in_js():
    assert set(MODULE.functions) <= set(run_js(list(MODULE.scripts), f"Object.keys({G})"))
