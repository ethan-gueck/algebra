/*
 * lines_math.js — browser mirror of core/formula.py (A1.4, A1.5, A1.15) + lines/solver.py (+ general/plotting/viewport.py).
 *
 * The page recalculates as the point and slope move, so the math is ported
 * here. Python stays the source of truth: tests/test_js_parity.py runs this
 * file and compares solve() with the Python output.
 * Exposes window.LineMath (browser) or module.exports (Node).
 */
(function (global) {
  "use strict";

  // ---- core/formula.py--------------------------------------------------------
  const linearForm = (b, c, x) => b * x + c;                          // y = bx + c
  const pointFormSlope = (x1, y1, m, x) => m * (x - x1) + y1;         // y − y₁ = m(x − x₁)
  const standardFormForLinearForm = (A, B, C, x) => (C - A * x) / B;  // Ax + By = C, for B ≠ 0
  const yIntercept = (m, x1, y1) => y1 - m * x1;                      // b = y₁ − m·x₁ (A1.4)
  const xInterceptOfLinearForm = (m, b) => -b / m;                    // x = −b / m
  // a > b ⇒ a + c > b + c, and ac > bc for c > 0, ac < bc for c < 0 (A1.15)
  const linearInequality = (a, b, c) => (a > b) === (a + c > b + c) && (a > b) === (c > 0 ? a * c > b * c : a * c < b * c);

  // ---- lines/solver.py----------------------------------------------------------
  const TABLE_XS = [-2, -1, 0, 1, 2];
  const clean = (v) => { const r = Number(v.toFixed(10)); return r === 0 ? 0 : r; };
  const fmt = (v) => String(Number(clean(v).toPrecision(4)));
  const coef = (v) => (clean(v) === 1 ? "" : clean(v) === -1 ? "-" : fmt(v));
  const signed = (v, symbol = "") => ` ${v < 0 ? "-" : "+"} ${fmt(Math.abs(v))}${symbol}`;

  // Exact rationals (Python: fractions.Fraction) for whole-number standard form.
  const babs = (n) => (n < 0n ? -n : n);
  const gcd = (a, b) => { a = babs(a); b = babs(b); while (b) [a, b] = [b, a % b]; return a; };
  const lcm = (a, b) => (a && b ? babs(a * b) / gcd(a, b) : 0n);
  function rational(x) {
    const [mantissa, exp = "0"] = String(x).toLowerCase().split("e");
    const [whole, frac = ""] = mantissa.split(".");
    let num = BigInt(whole + frac), den = 10n ** BigInt(frac.length);
    const e = Number(exp);
    if (e > 0) num *= 10n ** BigInt(e); else if (e < 0) den *= 10n ** BigInt(-e);
    const g = gcd(num, den) || 1n;
    return [num / g, den / g];
  }

  /** standard_coefficients (A = −m, B = 1, C = b) on the exact values, scaled to whole numbers with A ≥ 0. */
  function standardWholeNumbers(m, b) {
    const [mn, md] = rational(m), [bn, bd] = rational(b);
    const parts = [[-mn, md], [1n, 1n], [bn, bd]];
    const scale = parts.reduce((l, [, d]) => lcm(l, d), 1n);
    let [A, B, C] = parts.map(([n, d]) => (n * scale) / d);
    const divisor = gcd(gcd(A, B), C) || 1n;
    [A, B, C] = [A / divisor, B / divisor, C / divisor];
    if (A < 0n || (A === 0n && B < 0n)) [A, B, C] = [-A, -B, -C];
    return [Number(A), Number(B), Number(C)];
  }

  function slopeInterceptText(m, b) {
    if (m === 0) return `y = ${fmt(b)}`;
    return `y = ${coef(m)}x` + (b ? signed(b) : "");
  }

  function pointSlopeText(x1, y1, m) {
    const left = y1 === 0 ? "y" : `y${signed(-y1)}`;
    if (m === 0) return `${left} = 0`;
    return `${left} = ${coef(m)}` + (x1 === 0 ? "x" : `(x${signed(-x1)})`);
  }

  function standardText(A, B, C) {
    const terms = [];
    if (A) terms.push(`${A === 1 ? "" : A === -1 ? "-" : A}x`);
    if (B) {
      const k = Math.abs(B) === 1 ? "" : String(Math.abs(B));
      terms.push(terms.length ? `${B < 0 ? "-" : "+"} ${k}y` : `${B < 0 ? "-" : ""}${k}y`);
    }
    return `${terms.join(" ")} = ${C}`;
  }

  const table = (x1, y1, m, b, A, B, C) => TABLE_XS.map((x) => ({
    x,
    slope_intercept: clean(linearForm(m, b, x)),
    point_slope: clean(pointFormSlope(x1, y1, m, x)),
    standard: clean(standardFormForLinearForm(A, B, C, x)),
  }));

  // ---- Linear inequalities: y < mx + b and its relatives ------------------------
  const RELATIONS = ["=", "<", "≤", ">", "≥"];
  const FLIP = { "=": "=", "<": ">", "≤": "≥", ">": "<", "≥": "≤" };  // multiplying or dividing by a negative
  const holds = (left, relation, right) => ({ "=": left === right, "<": left < right, "≤": left <= right, ">": left > right, "≥": left >= right })[relation];
  const withRelation = (text, relation) => text.replace(" = ", ` ${relation} `);
  const py = (v) => (v ? "True" : "False");

  function inequality(m, b, A, B, C, relation, slopeIntercept, standard) {
    // Standard form is −mx + y relation b scaled by B (B = k·1): a negative B flips the sign.
    const standardRelation = B > 0 ? relation : FLIP[relation];
    // Test a point off the line: the origin, or (0, 1) when the line passes through it.
    const [x0, y0] = b === 0 ? [0, 1] : [0, 0];
    const right = clean(linearForm(m, b, x0));
    const inside = holds(y0, relation, right);
    const left = clean(A * x0 + B * y0);
    const dashed = relation === "<" || relation === ">";
    const sign = B < 0 ? "flips" : "stays";
    const by = B === 1 ? "y" : B === -1 ? "-y" : `${B}y`;
    const rest = A === 0 ? String(C) : `${C} − ${A === 1 ? "" : A}x`;
    const scale = B === 1 ? "" : `, then multiply by ${B} for whole numbers` + (B < 0 ? " (a negative, so the sign flips)" : "");
    const above = relation === ">" || relation === "≥";
    const steps = [
      { id: "inequality", title: "Write the inequality", math: `y ${relation} mx + b  →  ${withRelation(slopeIntercept, relation)}` },
      { id: "inequality", title: "Move x across: standard form", math: `subtract mx from both sides (the sign stays)${scale}  →  ${withRelation(standard, standardRelation)}` },
      { id: "inequality", title: "Back to y: divide by B", math: `${by} ${standardRelation} ${rest}, and dividing by B = ${B} the sign ${sign}  →  ${withRelation(slopeIntercept, relation)}` },
      { id: "inequality", title: "Check the rules with these numbers", math: `linear_inequality(a = ${fmt(left)}, b = ${C}, c = 1/B = ${fmt(1 / B)}) = ${py(linearInequality(left, C, 1 / B))}: adding keeps the sign, multiplying by ${B < 0 ? "a negative flips" : "a positive keeps"} it` },
      { id: "shade", title: "Test a point off the line", math: `(${fmt(x0)}, ${fmt(y0)}): ${fmt(y0)} ${relation} ${fmt(right)} is ${inside ? "true" : "false"}, so the solutions are the side ${inside ? "with" : "without"} this point: ${above ? "above" : "below"} the line` },
      { id: "shade", title: "Draw the boundary", math: dashed ? "< and > leave the line out: dashed" : "≤ and ≥ include the line: solid" },
    ];
    return {
      relation,
      slope_intercept_form: withRelation(slopeIntercept, relation),
      standard_relation: standardRelation,
      standard_form: withRelation(standard, standardRelation),
      shade: above ? "above" : "below",
      dashed,
      test_point: [x0, y0],
      test_holds: inside,
      steps,
    };
  }

  // ---- viewport.py ----------------------------------------------------------
  function niceStep(span, targetTicks = 8) {
    if (span <= 0) return 1;
    const raw = span / targetTicks;
    const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
    for (const k of [1, 2, 5, 10]) if (raw <= k * magnitude) return k * magnitude;
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

  function plotWindow(x1, y1, m, b, xi) {
    const xs = [x1, 0, ...(xi !== null && Math.abs(xi) <= 50 ? [xi] : [])];
    const ys = [y1, 0, ...(Math.abs(b) <= 50 ? [b] : [])];
    return fitViewport(xs, (x) => linearForm(m, b, x), { alwaysIncludeY: ys, padding: 0.2 });
  }

  /** Same shape as LineSolution.to_dict() in Python. */
  function solve(x1, y1, m, relation = "=") {
    if (!RELATIONS.includes(relation)) throw new Error(`relation must be one of ${RELATIONS.join(", ")}`);
    const b = clean(yIntercept(m, x1, y1));
    const xi = m === 0 ? null : clean(xInterceptOfLinearForm(m, yIntercept(m, x1, y1)));
    const [A, B, C] = standardWholeNumbers(m, b);
    const [slopeIntercept, standard] = [slopeInterceptText(m, b), standardText(A, B, C)];
    return {
      x1, y1, m, b, x_intercept: xi,
      standard: { A, B, C },
      slope_intercept_form: slopeIntercept,
      point_slope_form: pointSlopeText(x1, y1, m),
      standard_form: standard,
      table: table(x1, y1, m, b, A, B, C),
      window: plotWindow(x1, y1, m, b, xi),
      inequality: relation === "=" ? null : inequality(m, b, A, B, C, relation, slopeIntercept, standard),
    };
  }

  const api = {
    solve, fmt, RELATIONS,
    linear_inequality: linearInequality,
    linear_form: linearForm, point_form_slope: pointFormSlope, standard_form_for_linear_form: standardFormForLinearForm,
    y_intercept: yIntercept, x_intercept_of_linear_form: xInterceptOfLinearForm,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else global.LineMath = api;
})(typeof window !== "undefined" ? window : globalThis);
