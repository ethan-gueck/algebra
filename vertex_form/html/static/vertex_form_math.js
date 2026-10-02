/*
 * vertex_form_math.js — browser mirror of vertex_form/solver.py and the A1.12 section of core/formula.py.
 *
 * Loaded after a1's quadratic_math.js (window.QuadMath), which supplies the
 * parabola's details and the three forms as text, exactly as the Python solver
 * takes them from a1.solver.solve. Python stays the source of truth:
 * tests/test_js_parity.py runs this file and compares solve() with the Python output.
 * Exposes window.VertexMath (browser) or module.exports (Node).
 */
(function (global) {
  "use strict";
  const Quad = global.QuadMath;
  const { fmt } = Quad;

  // ---- core/formula.py: A1.12 Vertex Form ------------------------------------
  const parabola = (a, b, c, x) => a * x * x + b * x + c;
  const factoredForm = (a, r1, r2, x) => a * (x - r1) * (x - r2);
  const opens = (a) => (a > 0 ? "up" : "down");
  const vertexForm = (a, h, k, x) => a * (x - h) ** 2 + k;
  const convertStandardFormToVertexForm = (a, b, c) => { const h = -b / (2 * a); return [a, h, parabola(a, b, c, h)]; };
  const convertVertexFormToStandardForm = (a, h, k) => [a, -2 * a * h, a * h * h + k];
  const convertFactoredFormToVertexForm = (a, r1, r2) => { const h = (r1 + r2) / 2; return [a, h, factoredForm(a, r1, r2, h)]; };
  const convertFactoredFormToStandardForm = (a, r1, r2) => [a, -a * (r1 + r2), a * r1 * r2];

  // ---- vertex_form/solver.py (formatting helpers as in factoring/solver.py) ----
  const FORMS = ["standard", "vertex", "factored"];
  const PARAMS = { standard: ["a", "b", "c"], vertex: ["a", "h", "k"], factored: ["a", "r1", "r2"] };

  const clean = (v) => { const r = Number(v.toFixed(10)); return r === 0 ? 0 : r; };
  const p_ = (v) => (clean(v) < 0 ? `(${fmt(v)})` : fmt(v));
  const signed = (v, symbol = "") => ` ${clean(v) < 0 ? "-" : "+"} ${fmt(Math.abs(v))}${symbol}`;
  const coef = (v, symbol = "") => { const c = clean(v); return (c === 1 ? "" : c === -1 ? "-" : fmt(c)) + symbol; };
  const term = (v, symbol = "") => ` ${clean(v) < 0 ? "-" : "+"} ${coef(Math.abs(v), symbol)}`;
  function poly(a, b, c) {
    let text = coef(a, "x²");
    if (clean(b)) text += term(b, "x");
    if (clean(c)) text += signed(c);
    return text;
  }
  const step = (title, math) => ({ title, math });

  function toStandard(form, a, p, q) {
    let b, c;
    if (form === "vertex") [a, b, c] = convertVertexFormToStandardForm(a, p, q);
    else if (form === "factored") [a, b, c] = convertFactoredFormToStandardForm(a, p, q);
    else if (form === "standard") [b, c] = [p, q];
    else throw new Error(`form must be one of ${FORMS.join(", ")}`);
    return [a, clean(b), clean(c)];
  }

  const shifted = (h) => (clean(h) === 0 ? "x" : `(x${signed(-h)})`);
  const equation = (a, h, k) => `y = ${coef(a)}${shifted(h)}²` + (clean(k) ? signed(k) : "");

  // ---- Building a(x − h)² + k from y = x² --------------------------------------
  function transformations(a, h, k) {
    let shift, stretch, lift;
    if (clean(h) > 0) shift = `Shift right by ${fmt(h)}`;
    else if (clean(h) < 0) shift = `Shift left by ${fmt(-h)}`;
    else shift = "No horizontal shift (h = 0)";
    const size = Math.abs(a);
    if (clean(size - 1) === 0) stretch = a < 0 ? "Flip it upside down (a = −1)" : "No stretch (a = 1)";
    else stretch = `${size > 1 ? "Stretch" : "Compress"} vertically by ${fmt(size)}` + (a < 0 ? " and flip it (a < 0)" : "");
    if (clean(k) > 0) lift = `Shift up by ${fmt(k)}`;
    else if (clean(k) < 0) lift = `Shift down by ${fmt(-k)}`;
    else lift = "No vertical shift (k = 0)";
    return [
      { id: "parent", title: "Start from the parent y = x²", equation: "y = x²",
        math: "vertex (0, 0), axis x = 0, opens up" },
      { id: "shift", title: shift, equation: equation(1, h, 0),
        math: `replace x with x − h = ${shifted(h).replace(/[()]/g, "")}: the vertex slides from (0, 0) to (${fmt(h)}, 0)` },
      { id: "stretch", title: stretch, equation: equation(a, h, 0),
        math: `multiply every height by a = ${fmt(a)}: the vertex stays at (${fmt(h)}, 0) and the curve opens ${opens(a)}` },
      { id: "lift", title: lift, equation: equation(a, h, k),
        math: `add k = ${fmt(k)} to every height: the vertex lands on (${fmt(h)}, ${fmt(k)})` },
    ];
  }

  function features(a, h, k) {
    const size = Math.abs(a);
    let width;
    if (clean(size - 1) === 0) width = "the same width as y = x² (|a| = 1)";
    else if (size > 1) width = `narrower than y = x² (|a| = ${fmt(size)} > 1)`;
    else width = `wider than y = x² (|a| = ${fmt(size)} < 1)`;
    const up = opens(a) === "up";
    return {
      vertex: [h, k],
      axis: h,
      opens: opens(a),
      extreme: `${up ? "minimum" : "maximum"} y = ${fmt(k)} at x = ${fmt(h)}`,
      range: `y ${up ? "≥" : "≤"} ${fmt(k)}`,
      width,
    };
  }

  // ---- Converting into and out of vertex form -----------------------------------
  function completingTheSquare(a, b, c, h, k) {
    const half = b / (2 * a);
    const square = clean(half ** 2);
    const constant = clean(c) ? signed(c) : "";
    return [
      step("Factor a out of the x-terms", `y = ${coef(a)}(${poly(1, b / a, 0)})${constant}`),
      step("Halve the x-coefficient and square it", `(b / 2a)² = (${fmt(b / a)} / 2)² = ${fmt(square)}`),
      step("Add and subtract it inside the bracket", `y = ${coef(a)}(${poly(1, b / a, square)} - ${fmt(square)})${constant}`),
      step("Fold the first three terms into a square", `x² + (b/a)x + (b / 2a)² = ${shifted(h)}²  →  y = ${coef(a)}${shifted(h)}²${signed(-a * square)}${constant}`),
      step("Collect the constant: k = c − a(b / 2a)²", `k = ${fmt(c)} − ${p_(a)}·${fmt(square)} = ${fmt(k)}  →  ${equation(a, h, k)}`),
    ];
  }

  const shortcut = (a, b, c, h, k) => [
    step("Find h, the axis of symmetry", `h = −b / 2a = −${p_(b)} / (2·${p_(a)}) = ${fmt(h)}`),
    step("Find k by substituting h", `k = ah² + bh + c = ${p_(a)}·${p_(h)}² + ${p_(b)}·${p_(h)} + ${p_(c)} = ${fmt(k)}`),
    step("Write a(x − h)² + k", equation(a, h, k)),
  ];

  const expanding = (a, h, k, b, c, standard) => [
    step("Expand the square", `(x − h)² = x² − 2hx + h²  →  y = ${coef(a)}(${poly(1, -2 * h, h * h)})${clean(k) ? signed(k) : ""}`),
    step("Collect the coefficients", `b = −2ah = −2·${p_(a)}·${p_(h)} = ${fmt(b)},  c = ah² + k = ${p_(a)}·${p_(h)}² + ${p_(k)} = ${fmt(c)}`),
    step("Write ax² + bx + c", standard),
  ];

  const fromRoots = (a, r1, r2, h, k) => [
    step("h is midway between the roots", `h = (r₁ + r₂) / 2 = (${fmt(r1)} + ${p_(r2)}) / 2 = ${fmt(h)}`),
    step("k is the height there", `k = a(h − r₁)(h − r₂) = ${p_(a)}·(${fmt(h)} − ${p_(r1)})·(${fmt(h)} − ${p_(r2)}) = ${fmt(k)}`),
    step("Write a(x − h)² + k", equation(a, h, k)),
  ];

  /** Same shape as VertexFormSolution.to_dict() in Python. */
  function solve(form, a, p, q) {
    if (a === 0) throw new Error("'a' must be non-zero; with a = 0 the equation is linear, not quadratic.");
    let b, c, h, k;
    [a, b, c] = toStandard(form, a, p, q);
    const quadratic = Quad.solve(a, b, c);
    if (form === "vertex") [h, k] = [p, q];
    else if (form === "factored") [, h, k] = convertFactoredFormToVertexForm(a, p, q);
    else [, h, k] = convertStandardFormToVertexForm(a, b, c);
    [h, k] = [clean(h), clean(k)];
    const xs = quadratic.x_intercepts.map(([x]) => x);
    let fac = null;
    if (form === "factored") fac = { a, r1: Math.min(p, q), r2: Math.max(p, q) };
    else if (xs.length) fac = { a, r1: xs[0], r2: xs[xs.length - 1] };
    return {
      form,
      inputs: Object.fromEntries(PARAMS[form].map((name, i) => [name, [a, p, q][i]])),
      vertex: { a, h, k },
      standard: { a, b, c },
      factored: fac,
      equation: equation(a, h, k),
      forms: Object.fromEntries(FORMS.map((name) => [name, quadratic[`${name}_form`]])),
      quadratic,
      transformations: transformations(a, h, k),
      features: features(a, h, k),
      completing_square: completingTheSquare(a, b, c, h, k),
      shortcut: shortcut(a, b, c, h, k),
      expanding: expanding(a, h, k, b, c, quadratic.standard_form),
      from_roots: form === "factored" ? fromRoots(a, p, q, h, k) : null,
    };
  }

  const api = {
    solve, fmt, equation, FORMS, PARAMS, to_standard: toStandard,
    vertex_form: vertexForm,
    convert_standard_form_to_vertex_form: convertStandardFormToVertexForm,
    convert_vertex_form_to_standard_form: convertVertexFormToStandardForm,
    convert_factored_form_to_vertex_form: convertFactoredFormToVertexForm,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else global.VertexMath = api;
})(typeof window !== "undefined" ? window : globalThis);
