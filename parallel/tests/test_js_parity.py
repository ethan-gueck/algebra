"""The browser module (html/static/parallel_math.js) must match solver.py exactly."""

import json

import pytest

from general.jsrun import AVAILABLE, assert_close, run_js
from parallel.api import TOPIC
from parallel.solver import solve

MODULE = TOPIC.modules[0]
CASES = [(0, 1, 2, 5, 0, 3, 4, 1), (0, 1, 1, 3, 0, -3, 2, 1), (0, 0, 2, 1, 0, 4, 3, 1), (2, -2, 2, 4, -3, 1, 4, 1),
         (-1, -2, -1, 3, 3, -1, 3, 4), (0, 1, 1, 3, 2, 5, 3, 7), (0, 0, 0.3, 0.1, 0, 1, 3, 2), (-3.5, 2, 4, -1.25, 1, 1, 2.5, 6)]

pytestmark = pytest.mark.skipif(not AVAILABLE, reason="no JavaScript runtime (node or osascript)")


def test_solve_matches_python():
    calls = f"{json.dumps(CASES, ensure_ascii=False)}.map(function (t) {{ return window.{MODULE.global_name}.solve(t[0], t[1], t[2], t[3], t[4], t[5], t[6], t[7]); }})"
    for case, js in zip(CASES, run_js(list(MODULE.scripts), calls)):
        assert_close(json.loads(json.dumps(solve(*case).to_dict())), js, str(case))


def test_every_published_function_exists_in_js():
    assert set(MODULE.functions) <= set(run_js(list(MODULE.scripts), f"Object.keys(window.{MODULE.global_name})"))
