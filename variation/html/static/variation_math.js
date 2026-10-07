/*
 * variation_math.js — browser mirror of core/formula.py (A1.13) + variation/solver.py.
 *
 * The page recalculates as the points move, so the math is ported here.
 * Python stays the source of truth: tests/test_js_parity.py runs this file and
 * compares solve() with the Python output.
 * Exposes window.VariationMath (browser) or module.exports (Node).
 */
(function (global) {
  "use strict";

  // ---- core/formula.py--------------------------------------------------------
  const directVariation = (k, x) => k * x;    // y = kx
  const indirectVariation = (k, x) => k / x;  // y = k / x, for x ≠ 0

  // ---- variation/solver.py ----------------------------------------------------
  const KINDS = ["direct", "inverse"];
  const TABLE_XS = [-2, -1, 1, 2, 4];
  const clean = (v) => { const r = Number(v.toFixed(10)); return r === 0 ? 0 : r; };
  const fmt = (v) => String(Number(clean(v).toPrecision(4)));

  const constant = (kind, x1, y1) => (kind === "direct" ? y1 / x1 : x1 * y1);
  const predict = (kind, k, x) => (kind === "direct" ? directVariation(k, x) : indirectVariation(k, x));
  const invariant = (kind, x, y) => (kind === "direct" ? y / x : x * y);

  function equationText(kind, k) {
    if (kind === "direct") return `y = ${clean(k) === 1 ? "" : clean(k) === -1 ? "-" : fmt(k)}x`;
    return `y = ${fmt(k)} / x`;
  }

  const table = (kind, k) => TABLE_XS.map((x) => {
    const y = predict(kind, k, x);
    return { x, y: clean(y), invariant: clean(invariant(kind, x, y)) };
  });

  // ---- viewport.py ----------------------------------------------------------
  function niceStep(span, targetTicks = 8) {
    if (span <= 0) return 1;
    const raw = span / targetTicks;
    const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
    for (const k of [1, 2, 5, 10]) if (raw <= k * magnitude) return k * magnitude;
    return 10 * magnitude;
  }
  const snapOutward = (lo, hi, step) => [Math.floor(lo / step) * step, Math.ceil(hi / step) * step];

  function plotWindow(kind, k, x1, y1, x2, y2) {
    const lo = Math.min(0, x1, x2), hi = Math.max(0, x1, x2);
    const span = Math.max(hi - lo, 4);
    const mid = (lo + hi) / 2;
    const xStep = niceStep(span * 1.4);
    const [xMin, xMax] = snapOutward(mid - span * 0.7, mid + span * 0.7, xStep);
    const ys = [0, y1, y2, predict(kind, k, xMin), predict(kind, k, xMax)];
    let yLo = Math.min(...ys), yHi = Math.max(...ys);
    if (yHi - yLo < 4) {
      const centre = (yLo + yHi) / 2;
      [yLo, yHi] = [centre - 2, centre + 2];
    }
    const pad = (yHi - yLo) * 0.08;
    const yStep = niceStep(yHi - yLo + 2 * pad);
    const [yMin, yMax] = snapOutward(yLo - pad, yHi + pad, yStep);
    return { x_min: xMin, x_max: xMax, y_min: yMin, y_max: yMax, x_step: xStep, y_step: yStep };
  }

  /** Same shape as VariationSolution.to_dict() in Python. */
  function solve(x1, y1, x2, kind = "direct") {
    if (!KINDS.includes(kind)) throw new Error(`kind must be one of ${KINDS.join(", ")}`);
    if (x1 === 0) throw new Error("The known point needs x₁ ≠ 0: y = kx gives k = y₁ / x₁, and y = k / x is undefined at x = 0.");
    if (y1 === 0) throw new Error("The known point needs y₁ ≠ 0, or k = 0 and y is 0 everywhere: that is not a variation.");
    if (kind === "inverse" && x2 === 0) throw new Error("y = k / x is undefined at x = 0: pick x₂ ≠ 0.");
    const k = clean(constant(kind, x1, y1));
    const y2 = clean(predict(kind, k, x2));
    return {
      kind, x1, y1, x2, k, y2,
      x_scale: clean(x2 / x1),
      y_scale: clean(y2 / y1),
      equation: equationText(kind, k),
      table: table(kind, k),
      window: plotWindow(kind, k, x1, y1, x2, y2),
    };
  }

  const api = { solve, fmt, KINDS, direct_variation: directVariation, indirect_variation: indirectVariation };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else global.VariationMath = api;
})(typeof window !== "undefined" ? window : globalThis);
