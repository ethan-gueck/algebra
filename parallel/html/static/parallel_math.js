/*
 * parallel_math.js — browser mirror of core/formula.py (A1.4 slope, A1.6) + parallel/solver.py.
 *
 * The page recalculates as the points move, so the math is ported here. Python stays the
 * source of truth: tests/test_js_parity.py runs this file and compares solve() with Python.
 * Exposes window.ParallelMath (browser) or module.exports (Node).
 */
(function (global) {
  "use strict";

  // ---- core/formula.py--------------------------------------------------------
  const rise = (y1, y2) => y2 - y1;                                 // Δy = y₂ − y₁
  const run = (x1, x2) => x2 - x1;                                  // Δx = x₂ − x₁
  const slope = (x1, y1, x2, y2) => rise(y1, y2) / run(x1, x2);     // m = Δy / Δx
  const yIntercept = (m, x1, y1) => y1 - m * x1;                    // b = y₁ − m·x₁
  const angleOfInclination = (m) => (Math.atan(m) * 180) / Math.PI; // θ = arctan(m)
  const isclose = (a, b, absTol = 0) => Math.abs(a - b) <= Math.max(1e-9 * Math.max(Math.abs(a), Math.abs(b)), absTol);
  // A vertical line (run 0) has m = ∞.
  const slopeOf = (m, xa, ya, xb, yb) => (m !== null && m !== undefined ? m : run(xa, xb) === 0 ? Infinity : slope(xa, ya, xb, yb));
  function isParallel(m1 = null, m2 = null, x1, y1, x2, y2, x3, y3, x4, y4) {          // m₁ = m₂
    m1 = slopeOf(m1, x1, y1, x2, y2); m2 = slopeOf(m2, x3, y3, x4, y4);
    if (!Number.isFinite(m1) || !Number.isFinite(m2)) return !Number.isFinite(m1) && !Number.isFinite(m2);
    return isclose(m1, m2, 1e-12);
  }
  function isPerpendicular(m1 = null, m2 = null, x1, y1, x2, y2, x3, y3, x4, y4) {     // m₁ · m₂ = −1
    m1 = slopeOf(m1, x1, y1, x2, y2); m2 = slopeOf(m2, x3, y3, x4, y4);
    if (!Number.isFinite(m1) || !Number.isFinite(m2)) return (!Number.isFinite(m1) && m2 === 0) || (!Number.isFinite(m2) && m1 === 0);
    return isclose(m1 * m2, -1);
  }

  // ---- parallel/solver.py -------------------------------------------------------
  const clean = (v) => { const r = Number(v.toFixed(10)); return r === 0 ? 0 : r; };
  const fmt = (v) => String(Number(clean(v).toPrecision(4)));

  function line(xa, ya, xb, yb) {
    if (xa === xb && ya === yb) throw new Error("A line needs two different points.");
    if (run(xa, xb) === 0) return { m: null, b: null, vertical_x: clean(xa), equation: `x = ${fmt(xa)}`, angle: 90 };
    const m = clean(slope(xa, ya, xb, yb));
    const b = clean(yIntercept(m, xa, ya));
    let text;
    if (m === 0) text = `y = ${fmt(b)}`;
    else {
      const coef = m === 1 ? "" : m === -1 ? "-" : fmt(m);
      text = `y = ${coef}x` + (b === 0 ? "" : ` ${b < 0 ? "-" : "+"} ${fmt(Math.abs(b))}`);
    }
    return { m, b, vertical_x: null, equation: text, angle: clean(angleOfInclination(m)) };
  }

  function crossing(l1, l2) {
    if (l1.m === null && l2.m === null) return null;
    if (l1.m === null || l2.m === null) {
      const [v, o] = l1.m === null ? [l1, l2] : [l2, l1];
      const x = v.vertical_x;
      return [x, clean(o.m * x + o.b)];
    }
    if (isclose(l1.m, l2.m, 1e-12)) return null;
    const x = (l2.b - l1.b) / (l1.m - l2.m);
    return [clean(x), clean(l1.m * x + l1.b)];
  }

  function niceStep(span, targetTicks = 8) {
    if (span <= 0) return 1;
    const raw = span / targetTicks;
    const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
    for (const k of [1, 2, 5, 10]) if (raw <= k * magnitude) return k * magnitude;
    return 10 * magnitude;
  }
  const snapOutward = (lo, hi, step) => [Math.floor(lo / step) * step, Math.ceil(hi / step) * step];

  function plotWindow(points) {
    const xs = [...points.map((p) => p[0]), 0], ys = [...points.map((p) => p[1]), 0];
    const loX = Math.min(...xs), hiX = Math.max(...xs), loY = Math.min(...ys), hiY = Math.max(...ys);
    const span = Math.max(hiX - loX, hiY - loY, 4) * 1.3;
    const cx = (loX + hiX) / 2, cy = (loY + hiY) / 2;
    const step = niceStep(span);
    const [xMin, xMax] = snapOutward(cx - span / 2, cx + span / 2, step);
    const [yMin, yMax] = snapOutward(cy - span / 2, cy + span / 2, step);
    return { x_min: xMin, x_max: xMax, y_min: yMin, y_max: yMax, x_step: step, y_step: step };
  }

  /** Same shape as LinesSolution.to_dict() in Python. */
  function solve(x1, y1, x2, y2, x3, y3, x4, y4) {
    const l1 = line(x1, y1, x2, y2), l2 = line(x3, y3, x4, y4);
    const parallel = isParallel(null, null, x1, y1, x2, y2, x3, y3, x4, y4);
    const perpendicular = isPerpendicular(null, null, x1, y1, x2, y2, x3, y3, x4, y4);
    const same = parallel && (l1.m === null ? l1.vertical_x === l2.vertical_x : isclose(l1.b, l2.b, 1e-9));
    const relation = same ? "same line" : parallel ? "parallel" : perpendicular ? "perpendicular" : "neither";
    const product = l1.m === null || l2.m === null ? null : clean(l1.m * l2.m);
    let between = Math.abs(l1.angle - l2.angle);
    between = clean(Math.min(between, 180 - between));
    const meet = crossing(l1, l2);
    const pts = [[x1, y1], [x2, y2], [x3, y3], [x4, y4]];
    const near = [...pts, ...(meet && meet.every((c) => Math.abs(c) <= 50) ? [meet] : [])];
    return {
      points: pts, line1: l1, line2: l2, parallel, perpendicular, same_line: same,
      relation, product, angle_between: between, crossing: meet, window: plotWindow(near),
    };
  }

  const api = { solve, fmt, slope, is_parallel: isParallel, is_perpendicular: isPerpendicular };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else global.ParallelMath = api;
})(typeof window !== "undefined" ? window : globalThis);
