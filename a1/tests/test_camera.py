"""Dragging a slider should rarely move the axes, including straight through a = 0."""

import pytest

from a1.api import TOPIC
from general.jsrun import AVAILABLE, run_js
from general.styles import JS_DIR

pytestmark = pytest.mark.skipif(not AVAILABLE, reason="no JavaScript runtime (node or osascript)")

# Mirrors frame() in html/static/quadratic.js: framing() picks points + ideal window, view.follow() decides.
SWEEP = r"""
(function () {
  var Q = window.QuadMath, V = window.Manim.view, out = {};
  var ranges = { a: [-5, 5], b: [-10, 10], c: [-10, 10] };  // the page's slider ranges, step 0.1
  Object.keys(ranges).forEach(function (key) {
    var st = { a: 1, b: -3, c: 2 }, cur = Q.solve(1, -3, 2).window, moves = 0, widest = 0;
    for (var x = ranges[key][0]; x <= ranges[key][1] + 1e-9; x = Math.round((x + 0.1) * 10) / 10) {
      st[key] = x;
      var sol = st.a === 0 ? Q.solve_linear(st.b, st.c) : Q.solve(st.a, st.b, st.c);
      var f = Q.framing(sol);
      var target = V.follow(cur, f.window, f.points);
      if (target) { moves++; cur = target; }
      widest = Math.max(widest, cur.x_max - cur.x_min);
    }
    out[key] = { moves: moves, widest: widest };
  });
  return out;
})()
"""


@pytest.fixture(scope="module")
def sweep():
    return run_js([JS_DIR / "manim_canvas.js", *TOPIC.modules[0].scripts], SWEEP)


def test_slider_sweeps_rarely_move_axes(sweep):
    # Recomputing the ideal window on every step moved the axes 40 / 41 / 17 times.
    assert sweep["a"]["moves"] <= 10 and sweep["b"]["moves"] <= 6 and sweep["c"]["moves"] <= 3, sweep


def test_passing_through_a_zero_stays_framed(sweep):
    # Chasing the vertex as a -> 0 used to push the view out to x-spans of ~50+.
    assert sweep["a"]["widest"] <= 45, sweep
