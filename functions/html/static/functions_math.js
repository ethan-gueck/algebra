/*
 * functions_math.js — browser mirror of core/formula.py (A1.9) + functions/solver.py.
 *
 * The page recalculates as the inputs change, so the math is ported here. Python stays the
 * source of truth: tests/test_js_parity.py runs this file and compares solve() with Python.
 * Exposes window.FunctionsMath (browser) or module.exports (Node).
 */
(function (global) {
  "use strict";

  // ---- core/formula.py--------------------------------------------------------
  const functionNotation = (f, x) => f(x);            // y = f(x)
  const denominatorAllowed = (g) => g !== 0;          // 1 / g(x): g ≠ 0
  const evenRootAllowed = (g) => g >= 0;              // √g(x): g ≥ 0
  const logAllowed = (g) => g > 0;                    // ln g(x): g > 0
  function verticalLineTest(pairs) {                  // each x maps to exactly one y
    const outputs = new Map();
    for (const [x, y] of pairs) {
      if (!outputs.has(x)) outputs.set(x, y);
      else if (outputs.get(x) !== y) return false;
    }
    return true;
  }

  // ---- functions/solver.py -------------------------------------------------------
  const FAMILIES = ["linear", "quadratic", "reciprocal", "sqrt", "log", "sideways"];
  const clean = (v) => { const r = Number(v.toFixed(10)); return r === 0 ? 0 : r; };
  const fmt = (v) => String(Number(clean(v).toPrecision(4))).replaceAll("-", "−");

  function rule(family, a, h, k) {
    return {
      linear: (x) => a * (x - h) + k,
      quadratic: (x) => a * (x - h) ** 2 + k,
      reciprocal: (x) => a / (x - h) + k,
      sqrt: (x) => a * Math.sqrt(x - h) + k,
      log: (x) => a * Math.log(x - h) + k,
    }[family] || null;
  }

  function allowed(family, a, h, x) {
    const g = x - h;
    if (family === "reciprocal") return denominatorAllowed(g);
    if (family === "sqrt") return evenRootAllowed(g);
    if (family === "log") return logAllowed(g);
    if (family === "sideways") return evenRootAllowed(g / a);   // y = k ± √((x − h) / a)
    return true;
  }

  function outputs(family, a, h, k, x) {
    if (!allowed(family, a, h, x)) return [];
    if (family === "sideways") {
      const r = Math.sqrt((x - h) / a);
      return r === 0 ? [clean(k)] : [clean(k + r), clean(k - r)];
    }
    return [clean(functionNotation(rule(family, a, h, k), x))];
  }

  // An interval is [lo, hi, lo_closed, hi_closed]; null for lo or hi means −∞ or ∞.
  const ALL = () => [[null, null, false, false]];
  const ray = (at, up) => (up ? [[at, null, true, false]] : [[null, at, false, true]]);
  const without = (at) => [[null, at, false, false], [at, null, false, false]];

  function domain(family, a, h) {
    if (family === "reciprocal") return without(h);
    if (family === "sqrt") return ray(h, true);
    if (family === "log") return [[h, null, false, false]];
    if (family === "sideways") return ray(h, a > 0);
    return ALL();
  }

  function range(family, a, k) {
    if (family === "quadratic" || family === "sqrt") return ray(k, a > 0);
    if (family === "reciprocal") return without(k);
    return ALL();
  }

  function intervalText(intervals) {
    const one = ([lo, hi, loClosed, hiClosed]) =>
      `${lo === null ? "(−∞" : (loClosed ? "[" : "(") + fmt(lo)}, ${hi === null ? "∞)" : fmt(hi) + (hiClosed ? "]" : ")")}`;
    return intervals.map(one).join(" ∪ ");
  }

  const shift = (v, c) => (c === 0 ? v : `${v} ${c > 0 ? "−" : "+"} ${fmt(Math.abs(c))}`);
  const coef = (a) => (a === 1 ? "" : a === -1 ? "−" : fmt(a));
  const tail = (c) => (c === 0 ? "" : ` ${c > 0 ? "+" : "−"} ${fmt(Math.abs(c))}`);

  function equation(family, a, h, k) {
    const inner = shift("x", h);
    const wrapped = h === 0 ? inner : `(${inner})`;
    if (family === "sideways") {
      const y = shift("y", k);
      return `x = ${coef(a)}${k === 0 ? y : `(${y})`}²${tail(h)}`;
    }
    const body = {
      linear: a === 1 ? inner : `${coef(a)}${wrapped}`,
      quadratic: `${coef(a)}${wrapped}²`,
      reciprocal: `${fmt(a)} / ${wrapped}`,
      sqrt: `${coef(a)}√${wrapped}`,
      log: `${coef(a)}${Math.abs(a) === 1 ? "" : " "}ln${h === 0 ? " x" : wrapped}`,
    }[family];
    return `f(x) = ${body}${tail(k)}`;
  }

  function niceStep(span, targetTicks = 8) {
    if (span <= 0) return 1;
    const raw = span / targetTicks;
    const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
    for (const m of [1, 2, 5, 10]) if (raw <= m * magnitude) return m * magnitude;
    return 10 * magnitude;
  }
  const snapOutward = (lo, hi, step) => [Math.floor(lo / step) * step, Math.ceil(hi / step) * step];

  function plotWindow(points) {
    const xs = [...points.map((p) => p[0]), 0], ys = [...points.map((p) => p[1]), 0];
    const loX = Math.min(...xs), hiX = Math.max(...xs), loY = Math.min(...ys), hiY = Math.max(...ys);
    const span = Math.max(hiX - loX, hiY - loY, 8) * 1.3;
    const cx = (loX + hiX) / 2, cy = (loY + hiY) / 2;
    const step = niceStep(span);
    const [xMin, xMax] = snapOutward(cx - span / 2, cx + span / 2, step);
    const [yMin, yMax] = snapOutward(cy - span / 2, cy + span / 2, step);
    return { x_min: xMin, x_max: xMax, y_min: yMin, y_max: yMax, x_step: step, y_step: step };
  }

  /** Same shape as FunctionSolution.to_dict() in Python. */
  function solve(a, h, k, x0, family = "reciprocal") {
    if (!FAMILIES.includes(family)) throw new Error(`Unknown family '${family}': choose one of ${FAMILIES.join(", ")}.`);
    if (a === 0) throw new Error("a must not be 0: that flattens every family to the constant k.");
    const hits = outputs(family, a, h, k, x0);
    const key = [[h, k], ...hits.filter((y) => Math.abs(x0) <= 50 && Math.abs(y) <= 50).map((y) => [x0, y])];
    const window = plotWindow(key);
    const xs = Array.from({ length: 41 }, (_, i) => window.x_min + ((window.x_max - window.x_min) * i) / 40);
    const pairs = xs.flatMap((x) => outputs(family, a, h, k, x).map((y) => [x, y]));
    return {
      family, a, h, k, x0, equation: equation(family, a, h, k),
      domain: domain(family, a, h), range: range(family, a, k),
      domain_text: intervalText(domain(family, a, h)), range_text: intervalText(range(family, a, k)),
      in_domain: allowed(family, a, h, x0), hits,
      value: hits.length && family !== "sideways" ? hits[0] : null,
      is_function: verticalLineTest(pairs),
      vertical_asymptote: family === "reciprocal" || family === "log" ? h : null,
      horizontal_asymptote: family === "reciprocal" ? k : null,
      endpoint: family === "sqrt" || family === "sideways" ? [h, k] : null,
      window,
    };
  }

  const api = {
    solve, fmt, rule, outputs, allowed, FAMILIES,
    function_notation: functionNotation, denominator_allowed: denominatorAllowed,
    even_root_allowed: evenRootAllowed, log_allowed: logAllowed, vertical_line_test: verticalLineTest,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else global.FunctionsMath = api;
})(typeof window !== "undefined" ? window : globalThis);
