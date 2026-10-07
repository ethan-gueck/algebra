"""The browser module (html/static/factoring_math.js) must match solver.py exactly."""

import json

import pytest

from factoring.api import TOPIC
from factoring.solver import solve, special_products_table
from general.jsrun import AVAILABLE, assert_close, run_js

from .test_core import CASES

MODULE = TOPIC.modules[0]
MORE = [("standard", 6, -1, -1), ("standard", 4, 4, 1), ("standard", 1, 0, -9), ("standard", 0.5, -1, -4), ("vertex", -0.5, 2, 4.5), ("factored", 2, 0.25, -3)]

pytestmark = pytest.mark.skipif(not AVAILABLE, reason="no JavaScript runtime (node or osascript)")


def test_solve_matches_python():
    cases = CASES + MORE
    calls = f"{json.dumps(cases)}.map(function (t) {{ return window.{MODULE.global_name}.solve(t[0], t[1], t[2], t[3]); }})"
    for case, js in zip(cases, run_js(list(MODULE.scripts), calls)):
        assert_close(json.loads(json.dumps(solve(*case).to_dict())), js, str(case))


PRODUCTS = [(3, 2), (0.1, 0.3), (2, -3), (1, 1.0000001), (0, 5), (1.5, 0.5), (-0.7, 0.2)]


def test_special_products_match_python():
    calls = f"{json.dumps(PRODUCTS)}.map(function (t) {{ return window.{MODULE.global_name}.special_products_table(t[0], t[1]); }})"
    for case, js in zip(PRODUCTS, run_js(list(MODULE.scripts), calls)):
        assert_close(json.loads(json.dumps(special_products_table(*case))), js, str(case), rel=0)


def test_every_published_function_exists_in_js():
    assert set(MODULE.functions) <= set(run_js(list(MODULE.scripts), f"Object.keys(window.{MODULE.global_name})"))
