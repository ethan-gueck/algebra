"""The browser module (html/static/lines_math.js) must match solver.py exactly."""

import json

import pytest

from general.jsrun import AVAILABLE, assert_close, run_js
from lines.api import TOPIC
from lines.solver import solve

MODULE = TOPIC.modules[0]
CASES = [(1, 3, 2), (0, 4, -0.5), (-2, 3, 0), (0, 0, 1.5), (2, -1, 0.75), (-3.5, 2.25, -1.25), (4, -6, 3)]

pytestmark = pytest.mark.skipif(not AVAILABLE, reason="no JavaScript runtime (node or osascript)")


def test_solve_matches_python():
    calls = f"{json.dumps(CASES)}.map(function (t) {{ return window.{MODULE.global_name}.solve(t[0], t[1], t[2]); }})"
    for case, js in zip(CASES, run_js(list(MODULE.scripts), calls)):
        assert_close(json.loads(json.dumps(solve(*case).to_dict())), js, str(case))


def test_every_published_function_exists_in_js():
    assert set(MODULE.functions) <= set(run_js(list(MODULE.scripts), f"Object.keys(window.{MODULE.global_name})"))
