/*
 * quadratic_math.js — browser mirror of core/formula.py + general/plotting/viewport.py.
 *
 * The page needs live recalculation as sliders move, so the math is ported
 * here. Python stays the source of truth: tests/test_js_parity.py runs this
 * file under Node and compares solve() against the Python output.
 * Exposes window.QuadMath (browser) or module.exports (Node).
 */
(function (global) {
  "use strict";

  const clean = (v) => { const r = Number(v.toFixed(10)); return r === 0 ? 0 : r; };
  const isZero = (v, ...scale) => Math.abs(v) <= 1e-12 * Math.max(1, ...scale.map(Math.abs));
  const fmt = (v) => String(Number(clean(v).toPrecision(4)));
  const coef = (v) => (clean(v) === 1 ? "" : clean(v) === -1 ? "-" : fmt(v));
  const signed = (v, symbol = "") => ` ${v < 0 ? "-" : "+"} ${fmt(Math.abs(v))}${symbol}`;
  const shiftedX = (h) => (h === 0 ? "x" : `(x${signed(-h)})`);

  function validate(a) {
    if (a === 0) throw new Error("'a' must be non-zero; with a = 0 the equation is linear, not quadratic.");
  }

  const evaluate = (a, b, c, x) => a * x * x + b * x + c;
  const discriminant = (a, b, c) => b * b - 4 * a * c;

  function rootNature(a, b, c) {
    const d = discriminant(a, b, c);
    if (isZero(d, b * b, 4 * a * c)) return "one repeated real root";
    return d > 0 ? "two distinct real roots" : "two complex conjugate roots";
  }

  function roots(a, b, c) {
    validate(a);
    const d = discriminant(a, b, c);
    if (isZero(d, b * b, 4 * a * c)) {
      const x = clean(-b / (2 * a));
      return [{ re: x, im: 0 }, { re: x, im: 0 }];
    }
    if (d > 0) {
      const sq = Math.sqrt(d);
      const q = -0.5 * (b + (b < 0 ? -sq : sq));
      const [x1, x2] = [clean(q / a), clean(c / q)].sort((m, n) => m - n);
      return [{ re: x1, im: 0 }, { re: x2, im: 0 }];
    }
    const re = clean(-b / (2 * a));
    const im = clean(Math.sqrt(-d) / (2 * Math.abs(a)));
    return [{ re, im: -im }, { re, im }];
  }

  function xIntercepts(a, b, c) {
    const [r1, r2] = roots(a, b, c);
    if (r1.im !== 0) return [];
    const xs = r1.re === r2.re ? [r1.re] : [r1.re, r2.re];
    return xs.map((x) => [x, 0]);
  }

  function vertex(a, b, c) {
    validate(a);
    const h = -b / (2 * a);
    return [clean(h), clean(evaluate(a, b, c, h))];
  }

  function standardForm(a, b, c) {
    let text = `y = ${coef(a)}x²`;
    if (b === 1 || b === -1) return text + ` ${b > 0 ? "+" : "-"} x` + (c ? signed(c) : "");
    if (b) text += signed(b, "x");
    if (c) text += signed(c);
    return text;
  }

  function vertexForm(a, b, c) {
    const [h, k] = vertex(a, b, c);
    return `y = ${coef(a)}${shiftedX(h)}²` + (k ? signed(k) : "");
  }

  function factoredForm(a, b, c) {
    if (!xIntercepts(a, b, c).length) return null;
    const [r1, r2] = roots(a, b, c);
    if (r1.re === r2.re) return `y = ${coef(a)}${shiftedX(r1.re)}²`;
    return `y = ${coef(a)}${shiftedX(r1.re)}${shiftedX(r2.re)}`;
  }

  // ---- viewport.py ----------------------------------------------------------
  function niceStep(span, targetTicks = 8) {
    if (span <= 0) return 1;
    const raw = span / targetTicks;
    const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
    for (const m of [1, 2, 5, 10]) if (raw <= m * magnitude) return m * magnitude;
    return 10 * magnitude;
  }

  const snapOutward = (lo, hi, step) => [Math.floor(lo / step) * step, Math.ceil(hi / step) * step];

  function fitViewport(xs, f, { alwaysIncludeY = [], padding = 0.25, minSpan = 4, samples = 101 } = {}) {
    const lo = Math.min(...xs), hi = Math.max(...xs);
    const span = Math.max(hi - lo, minSpan);
    const mid = (lo + hi) / 2;
    let xLo = mid - span * (0.5 + padding), xHi = mid + span * (0.5 + padding);
    const xStep = niceStep(xHi - xLo);
    [xLo, xHi] = snapOutward(xLo, xHi, xStep);

    const ys = [];
    for (let i = 0; i < samples; i++) ys.push(f(xLo + (xHi - xLo) * i / (samples - 1)));
    ys.push(...alwaysIncludeY);
    let yLo = Math.min(...ys), yHi = Math.max(...ys);
    if (yHi - yLo < minSpan) {
      const centre = (yLo + yHi) / 2;
      [yLo, yHi] = [centre - minSpan / 2, centre + minSpan / 2];
    }
    const yPad = (yHi - yLo) * 0.08;
    const yStep = niceStep(yHi - yLo + 2 * yPad);
    [yLo, yHi] = snapOutward(yLo - yPad, yHi + yPad, yStep);
    return { x_min: xLo, x_max: xHi, y_min: yLo, y_max: yHi, x_step: xStep, y_step: yStep };
  }

  function plotWindow(a, b, c) {
    const [h, k] = vertex(a, b, c);
    const xs = [h, 0, ...xIntercepts(a, b, c).map(([x]) => x)];
    return fitViewport(xs, (x) => evaluate(a, b, c, x), { alwaysIncludeY: [k, c, 0] });
  }

  /** Same shape as QuadraticSolution.to_dict() in Python. */
  function solve(a, b, c) {
    validate(a);
    return {
      a, b, c,
      discriminant: clean(discriminant(a, b, c)),
      root_nature: rootNature(a, b, c),
      roots: roots(a, b, c),
      x_intercepts: xIntercepts(a, b, c),
      vertex: vertex(a, b, c),
      axis_of_symmetry: vertex(a, b, c)[0],
      y_intercept: [0, clean(c)],
      direction: a > 0 ? "up" : "down",
      standard_form: standardForm(a, b, c),
      vertex_form: vertexForm(a, b, c),
      factored_form: factoredForm(a, b, c),
      window: plotWindow(a, b, c),
    };
  }

  /** Degenerate a = 0 case (y = bx + c); same shape as solve_linear() in Python. */
  function solveLinear(b, c) {
    let nature, root = null, form;
    if (b === 0) {
      nature = c === 0 ? "every x is a root (y = 0)" : "no roots (horizontal line)";
      form = c === 0 ? "y = 0" : `y = ${fmt(c)}`;
    } else {
      nature = "one root (linear)";
      root = clean(-c / b);
      form = (b === 1 || b === -1 ? `y = ${b < 0 ? "-" : ""}x` : `y = ${coef(b)}x`) + (c ? signed(c) : "");
    }
    return {
      a: 0, b, c, linear: true, root_nature: nature, root,
      x_intercepts: root === null ? [] : [[root, 0]],
      y_intercept: [0, clean(c)],
      standard_form: form,
    };
  }

  /**
   * What the page camera should frame for a solution (quadratic or linear):
   * the y-intercept, real roots and vertex, minus any point beyond `reach`.
   * As a → 0 the vertex and one root run off to infinity; leaving them out keeps
   * the view continuous through a = 0 instead of zooming out wildly.
   */
  function framing(sol, reach = { x: 15, y: 60 }) {
    const points = [sol.y_intercept, ...sol.x_intercepts, ...(sol.linear ? [] : [sol.vertex])]
      .filter(([x, y]) => Math.abs(x) <= reach.x && Math.abs(y) <= reach.y);
    const window = fitViewport([0, ...points.map(([x]) => x)], (x) => evaluate(sol.a, sol.b, sol.c, x), {
      alwaysIncludeY: [0, ...points.map(([, y]) => y)],
    });
    return { points, window };
  }

  const api = { solve, solve_linear: solveLinear, framing, evaluate, discriminant, roots, vertex, fmt, niceStep, fitViewport };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else global.QuadMath = api;
})(typeof window !== "undefined" ? window : globalThis);
