"""The browser module (html/static/variation_math.js) must match solver.py exactly."""

import json

import pytest

from general.jsrun import AVAILABLE, assert_close, run_js
from variation.api import TOPIC
from variation.solver import solve

MODULE = TOPIC.modules[0]
CASES = [(2, 6, 4, "direct"), (2, -3, 4, "direct"), (1, 1, 5, "direct"), (-2.5, 4, 3, "direct"), (2, 6, 0, "direct"), (0.5, 0.75, -6, "direct"),
         (2, 6, 4, "inverse"), (-3, 4, 6, "inverse"), (40, 3, 60, "inverse"), (1, 1, -0.5, "inverse"), (2.5, -2, 8, "inverse")]

pytestmark = pytest.mark.skipif(not AVAILABLE, reason="no JavaScript runtime (node or osascript)")


def test_solve_matches_python():
    calls = f"{json.dumps(CASES, ensure_ascii=False)}.map(function (t) {{ return window.{MODULE.global_name}.solve(t[0], t[1], t[2], t[3]); }})"
    for case, js in zip(CASES, run_js(list(MODULE.scripts), calls)):
        assert_close(json.loads(json.dumps(solve(*case).to_dict())), js, str(case))


def test_every_published_function_exists_in_js():
    assert set(MODULE.functions) <= set(run_js(list(MODULE.scripts), f"Object.keys(window.{MODULE.global_name})"))
