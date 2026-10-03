"""The browser module (html/static/complex_numbers_math.js) must match solver.py exactly."""

import json

import pytest

from complex_numbers.api import TOPIC
from complex_numbers.solver import solve
from general.jsrun import AVAILABLE, assert_close, run_js

from .test_core import CASES

MODULE = TOPIC.modules[0]

pytestmark = pytest.mark.skipif(not AVAILABLE, reason="no JavaScript runtime (node or osascript)")


def test_solve_matches_python():
    cases = CASES + [(2.5, -1.5), (-7, 0.5), (8, 8)]
    calls = f"{json.dumps(cases)}.map(function (t) {{ return window.{MODULE.global_name}.solve(t[0], t[1]); }})"
    for case, js in zip(cases, run_js(list(MODULE.scripts), calls)):
        assert_close(json.loads(json.dumps(solve(*case).to_dict())), js, str(case))


def test_every_published_function_exists_in_js():
    assert set(MODULE.functions) <= set(run_js(list(MODULE.scripts), f"Object.keys(window.{MODULE.global_name})"))
