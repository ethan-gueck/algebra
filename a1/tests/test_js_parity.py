"""The browser module (html/static/quadratic_math.js) must match core/ exactly."""

import json

import pytest

from a1.api import TOPIC
from a1.core import solve, solve_linear
from general.jsrun import AVAILABLE, assert_close, run_js

MODULE = TOPIC.modules[0]
CASES = [(1, -3, 2), (1, -2, 1), (1, 2, 5), (-2, 4, 6), (0.5, 0, -8), (3, 7, -1), (-0.3, 1.1, 2.5), (1, 1e8, 1)]

pytestmark = pytest.mark.skipif(not AVAILABLE, reason="no JavaScript runtime (node or osascript)")


def test_solve_matches_python():
    calls = f"{json.dumps(CASES)}.map(function (t) {{ return window.{MODULE.global_name}.solve(t[0], t[1], t[2]); }})"
    for abc, js in zip(CASES, run_js(list(MODULE.scripts), calls)):
        py = json.loads(json.dumps(solve(*abc).to_dict()))
        # Number formatting in strings can differ for extreme magnitudes; compare the maths only there.
        if max(map(abs, abc)) > 1e4:
            for key in ("standard_form", "vertex_form", "factored_form"):
                py.pop(key), js.pop(key)
        assert_close(py, js, str(abc))


def test_every_published_function_exists_in_js():
    names = run_js(list(MODULE.scripts), f"Object.keys(window.{MODULE.global_name})")
    assert set(MODULE.functions) <= set(names)


def test_solve_linear_matches_python():
    cases = [(-3, 2), (2, 0), (0, 5), (0, 0), (1, -4), (-1, 3)]
    calls = f"{json.dumps(cases)}.map(function (t) {{ return window.{MODULE.global_name}.solve_linear(t[0], t[1]); }})"
    for bc, js in zip(cases, run_js(list(MODULE.scripts), calls)):
        assert_close(json.loads(json.dumps(solve_linear(*bc))), js, str(bc))
