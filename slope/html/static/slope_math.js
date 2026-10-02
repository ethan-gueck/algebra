/*
 * slope_math.js — browser mirror of slope/solver.py (+ general/plotting/viewport.py).
 *
 * The page recalculates as points move, so the math is ported here. Python
 * stays the source of truth: tests/test_js_parity.py runs this file and
 * compares solve() with the Python output.
 * Exposes window.SlopeMath (browser) or module.exports (Node).
 */
(function (global) {
  "use strict";

  const clean = (v) => { const r = Number(v.toFixed(10)); return r === 0 ? 0 : r; };
  const isZero = (v, ...scale) => Math.abs(v) <= 1e-12 * Math.max(1, ...scale.map(Math.abs));
  const fmt = (v) => String(Number(clean(v).toPrecision(4)));
  const coef = (v) => (clean(v) === 1 ? "" : clean(v) === -1 ? "-" : fmt(v));
  const signed = (v, symbol = "") => ` ${v < 0 ? "-" : "+"} ${fmt(Math.abs(v))}${symbol}`;

  function validate(x1, y1, x2, y2) {
    if (x1 === x2 && y1 === y2) throw new Error("The two points are the same; a line needs two different points.");
  }

  const rise = (x1, y1, x2, y2) => clean(y2 - y1);
  const run = (x1, y1, x2, y2) => clean(x2 - x1);

  function slope(x1, y1, x2, y2) {
    validate(x1, y1, x2, y2);
    const dx = x2 - x1;
    if (isZero(dx, x1, x2)) return null;
    return clean((y2 - y1) / dx);
  }

  function classify(m) {
    if (m === null) return "undefined";
    if (m === 0) return "zero";
    return m > 0 ? "positive" : "negative";
  }

  // formula.py: m = Δy / Δx, b = y₁ − m·x₁, x = x₁ − y₁ / m (unrounded m, as in Python)
  const rawSlope = (x1, y1, x2, y2) => (y2 - y1) / (x2 - x1);

  function yIntercept(x1, y1, x2, y2) {
    if (slope(x1, y1, x2, y2) === null) return null;
    return clean(y1 - rawSlope(x1, y1, x2, y2) * x1);
  }

  function xIntercept(x1, y1, x2, y2) {
    const m = slope(x1, y1, x2, y2);
    if (m === null) return clean(x1);
    if (m === 0) return null;
    return clean(x1 - y1 / rawSlope(x1, y1, x2, y2));
  }

  function angleOfInclination(x1, y1, x2, y2) {
    if (slope(x1, y1, x2, y2) === null) return 90;
    return clean((Math.atan((y2 - y1) / (x2 - x1)) * 180) / Math.PI);
  }

  function slopeInterceptForm(m, b, x1 = 0) {
    if (m === null) return `x = ${fmt(x1)}`;
    if (m === 0) return `y = ${fmt(b)}`;
    return `y = ${coef(m)}x` + (b ? signed(b) : "");
  }

  function pointSlopeForm(x1, y1, m) {
    if (m === null) return `x = ${fmt(x1)}`;
    const left = y1 === 0 ? "y" : `y${signed(-y1)}`;
    if (m === 0) return `${left} = 0`;
    const shifted = x1 === 0 ? "x" : `(x${signed(-x1)})`;
    return `${left} = ${coef(m)}${shifted}`;
  }

  // ---- Exact rationals for standard form (Python uses fractions.Fraction) ----
  const babs = (n) => (n < 0n ? -n : n);
  const gcd = (a, b) => { a = babs(a); b = babs(b); while (b) [a, b] = [b, a % b]; return a; };
  const lcm = (a, b) => (a && b ? babs(a * b) / gcd(a, b) : 0n);

  /** The exact value of a number's shortest decimal form, as [numerator, denominator]. */
  function rational(x) {
    const [mantissa, exp = "0"] = String(x).toLowerCase().split("e");
    const [whole, frac = ""] = mantissa.split(".");
    let num = BigInt(whole + frac), den = 10n ** BigInt(frac.length);
    const e = Number(exp);
    if (e > 0) num *= 10n ** BigInt(e); else if (e < 0) den *= 10n ** BigInt(-e);
    const g = gcd(num, den) || 1n;
    return [num / g, den / g];
  }
  const sub = ([a, b], [c, d]) => [a * d - c * b, b * d];
  const mul = ([a, b], [c, d]) => [a * c, b * d];
  const add = ([a, b], [c, d]) => [a * d + c * b, b * d];
  const reduce = ([a, b]) => { const g = gcd(a, b) || 1n; return b < 0n ? [-a / g, -b / g] : [a / g, b / g]; };

  function standardForm(x1, y1, x2, y2) {
    validate(x1, y1, x2, y2);
    const fa = reduce(sub(rational(y2), rational(y1)));
    const fb = reduce(sub(rational(x1), rational(x2)));
    const fc = reduce(add(mul(fa, rational(x1)), mul(fb, rational(y1))));
    const scale = [fa, fb, fc].reduce((l, [, d]) => lcm(l, d), 1n);
    let [a, b, c] = [fa, fb, fc].map(([n, d]) => (n * scale) / d);
    const divisor = gcd(gcd(a, b), c) || 1n;
    [a, b, c] = [a / divisor, b / divisor, c / divisor];
    if (a < 0n || (a === 0n && b < 0n)) [a, b, c] = [-a, -b, -c];
    const terms = [];
    if (a) terms.push(`${a === 1n ? "" : a === -1n ? "-" : a}x`);
    if (b) {
      const k = babs(b) === 1n ? "" : String(babs(b));
      terms.push(terms.length ? `${b < 0n ? "-" : "+"} ${k}y` : `${b < 0n ? "-" : ""}${k}y`);
    }
    return `${terms.join(" ")} = ${c}`;
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

  function plotWindow(x1, y1, x2, y2) {
    const m = slope(x1, y1, x2, y2);
    const b = yIntercept(x1, y1, x2, y2);
    const xi = xIntercept(x1, y1, x2, y2);
    const xs = [x1, x2, 0, ...(xi !== null && Math.abs(xi) <= 50 ? [xi] : [])];
    const f = m === null ? () => y1 : (x) => m * x + b;
    const ys = [y1, y2, 0, ...(b !== null && Math.abs(b) <= 50 ? [b] : [])];
    return fitViewport(xs, f, { alwaysIncludeY: ys, padding: 0.2 });
  }

  /** Same shape as SlopeSolution.to_dict() in Python. */
  function solve(x1, y1, x2, y2) {
    const m = slope(x1, y1, x2, y2);
    const b = yIntercept(x1, y1, x2, y2);
    return {
      x1, y1, x2, y2,
      rise: rise(x1, y1, x2, y2),
      run: run(x1, y1, x2, y2),
      slope: m,
      kind: classify(m),
      angle: angleOfInclination(x1, y1, x2, y2),
      y_intercept: b,
      x_intercept: xIntercept(x1, y1, x2, y2),
      slope_intercept_form: slopeInterceptForm(m, b, x1),
      point_slope_form: pointSlopeForm(x1, y1, m),
      standard_form: standardForm(x1, y1, x2, y2),
      window: plotWindow(x1, y1, x2, y2),
    };
  }

  const api = { solve, slope, rise, run, y_intercept: yIntercept, x_intercept: xIntercept, fmt, fitViewport };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else global.SlopeMath = api;
})(typeof window !== "undefined" ? window : globalThis);
