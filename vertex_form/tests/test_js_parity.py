"""The browser module (html/static/vertex_form_math.js) must match solver.py exactly."""

import json

import pytest

from vertex_form.api import TOPIC
from vertex_form.solver import solve
from general.jsrun import AVAILABLE, assert_close, run_js

from .test_core import CASES

MODULE = TOPIC.modules[0]
MORE = [("vertex", 4, -0.75, 1.5), ("vertex", -3, 2, -2), ("standard", 0.5, -1, -4), ("standard", -1, 3, 0), ("factored", 0.5, -3, 4), ("factored", -2, 1.5, 1.5)]

pytestmark = pytest.mark.skipif(not AVAILABLE, reason="no JavaScript runtime (node or osascript)")


def test_solve_matches_python():
    cases = CASES + MORE
    calls = f"{json.dumps(cases)}.map(function (t) {{ return window.{MODULE.global_name}.solve(t[0], t[1], t[2], t[3]); }})"
    for case, js in zip(cases, run_js(list(MODULE.scripts), calls)):
        assert_close(json.loads(json.dumps(solve(*case).to_dict())), js, str(case))


def test_every_published_function_exists_in_js():
    assert set(MODULE.functions) <= set(run_js(list(MODULE.scripts), f"Object.keys(window.{MODULE.global_name})"))
