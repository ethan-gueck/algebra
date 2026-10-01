"""The browser module (html/static/slope_math.js) must match core/ exactly."""

import json

import pytest

from general.jsrun import AVAILABLE, assert_close, run_js
from slope.api import TOPIC
from slope.core import solve

MODULE = TOPIC.modules[0]
CASES = [(1, 1, 4, 3), (-2, 4, 3, -1), (-3, 2, 4, 2), (2, -3, 2, 4), (0, 0, 1, 1), (0.5, 1.5, 2, -0.25), (-3, 0, 5, 0), (1.5, -2.5, -4, 7)]

pytestmark = pytest.mark.skipif(not AVAILABLE, reason="no JavaScript runtime (node or osascript)")


def test_solve_matches_python():
    calls = f"{json.dumps(CASES)}.map(function (t) {{ return window.{MODULE.global_name}.solve(t[0], t[1], t[2], t[3]); }})"
    for points, js in zip(CASES, run_js(list(MODULE.scripts), calls)):
        assert_close(json.loads(json.dumps(solve(*points).to_dict())), js, str(points))


def test_every_published_function_exists_in_js():
    names = run_js(list(MODULE.scripts), f"Object.keys(window.{MODULE.global_name})")
    assert set(MODULE.functions) <= set(names)
