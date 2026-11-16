"""The browser module (html/static/functions_math.js) must match solver.py exactly."""

import json

import pytest

from general.jsrun import AVAILABLE, assert_close, run_js
from functions.api import TOPIC
from functions.solver import solve

MODULE = TOPIC.modules[0]
CASES = [(2, 0, 1, 3, "linear"), (-0.5, 1.5, -2, 4, "linear"), (-1, 1, 4, 3, "quadratic"), (2, -1, 3, 0.25, "quadratic"),
         (1, 2, 0, 4, "reciprocal"), (1, 2, 0, 2, "reciprocal"), (-3, -1, 2, 5, "reciprocal"), (1, 1, 1, 0, "sqrt"),
         (-2, -3, 0, 6, "sqrt"), (1, -1, 0, 0, "log"), (2.5, 1, -1, 7, "log"), (1, -1, 0, -3, "log"),
         (1, -2, 0, 2, "sideways"), (-1, 3, 1, -1, "sideways"), (0.5, 0, -1, 8, "sideways"), (1, 0, 0, 0, "sideways")]

pytestmark = pytest.mark.skipif(not AVAILABLE, reason="no JavaScript runtime (node or osascript)")


def test_solve_matches_python():
    calls = f"{json.dumps(CASES, ensure_ascii=False)}.map(function (t) {{ return window.{MODULE.global_name}.solve(t[0], t[1], t[2], t[3], t[4]); }})"
    for case, js in zip(CASES, run_js(list(MODULE.scripts), calls)):
        assert_close(json.loads(json.dumps(solve(*case).to_dict())), js, str(case))


def test_every_published_function_exists_in_js():
    assert set(MODULE.functions) <= set(run_js(list(MODULE.scripts), f"Object.keys(window.{MODULE.global_name})"))
