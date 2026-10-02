/*
 * factoring_math.js — browser mirror of factoring/solver.py and the A1.10 / A1.12 sections of core/formula.py.
 *
 * Loaded after a1's quadratic_math.js (window.QuadMath), which supplies the
 * parabola's details and the three forms as text, exactly as the Python solver
 * takes them from a1.solver.solve. Python stays the source of truth:
 * tests/test_js_parity.py runs this file and compares solve() with the Python output.
 * Exposes window.FactorMath (browser) or module.exports (Node).
 */
(function (global) {
  "use strict";
  const Quad = global.QuadMath;
  const { fmt } = Quad;

  // ---- core/formula.py: A1.10 Factoring, A1.12 Vertex Form ----------------
  const discriminant = (a, b, c) => b * b - 4 * a * c;
  const parabola = (a, b, c, x) => a * x * x + b * x + c;
  const factoredForm = (a, r1, r2, x) => a * (x - r1) * (x - r2);
  const vertexForm = (a, h, k, x) => a * (x - h) ** 2 + k;
  const convertFactoredFormToStandardForm = (a, r1, r2) => [a, -a * (r1 + r2), a * r1 * r2];
  const convertVertexFormToStandardForm = (a, h, k) => [a, -2 * a * h, a * h * h + k];
  const convertStandardFormToVertexForm = (a, b, c) => { const h = -b / (2 * a); return [a, h, parabola(a, b, c, h)]; };
  const convertFactoredFormToVertexForm = (a, r1, r2) => { const h = (r1 + r2) / 2; return [a, h, factoredForm(a, r1, r2, h)]; };
  function convertStandardFormToFactoredForm(a, b, c) {
    const d = discriminant(a, b, c);
    if (d < 0) throw new Error("The quadratic does not have real roots.");
    return [a, (-b + Math.sqrt(d)) / (2 * a), (-b - Math.sqrt(d)) / (2 * a)];
  }
  function convertVertexFormToFactoredForm(a, h, k) {
    const square = -k / a;
    if (square < 0) throw new Error("The vertex form does not yield real roots.");
    return [a, h + Math.sqrt(square), h - Math.sqrt(square)];
  }
  const acMethod = (a, b, c) => { const d = discriminant(a, b, c); return [(b + Math.sqrt(d)) / 2, (b - Math.sqrt(d)) / 2]; };

  // ---- factoring.py ----------------------------------------------------------
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
  const binomial = (p, q) => `(${coef(p, "x")}${clean(q) ? signed(q) : ""})`;
  const whole = (v) => Math.abs(v - Math.round(v)) < 1e-9;
  const step = (title, math) => ({ title, math });
  const isqrt = (n) => { let r = Math.floor(Math.sqrt(n)); while (r * r > n) r--; while ((r + 1) * (r + 1) <= n) r++; return r; };
  const gcd = (...ns) => ns.reduce((x, y) => { x = Math.abs(x); y = Math.abs(y); while (y) [x, y] = [y, x % y]; return x; }, 0);

  function toStandard(form, a, p, q) {
    let b, c;
    if (form === "vertex") [a, b, c] = convertVertexFormToStandardForm(a, p, q);
    else if (form === "factored") [a, b, c] = convertFactoredFormToStandardForm(a, p, q);
    else if (form === "standard") [b, c] = [p, q];
    else throw new Error(`form must be one of ${FORMS.join(", ")}`);
    return [a, clean(b), clean(c)];
  }

  // ---- Can it be factored? ---------------------------------------------------
  function factorability(a, b, c, d, nature) {
    const isWhole = [a, b, c].every(whole);
    const square = d >= 0 && whole(d) && isqrt(Math.round(d)) ** 2 === Math.round(d);
    if (nature.startsWith("two complex")) {
      return { over_reals: false, over_integers: false, verdict: "No: it can't be factored over the real numbers.",
        reason: `Δ = ${fmt(d)} < 0, so the parabola never touches the x-axis: there are no real roots to factor out.` };
    }
    if (nature.startsWith("one repeated")) {
      return { over_reals: true, over_integers: isWhole && square, verdict: "Yes: it's a perfect square.",
        reason: "Δ = 0, so there is one repeated root r and y = a(x − r)²." };
    }
    if (isWhole && square) {
      return { over_reals: true, over_integers: true, verdict: "Yes: it factors over the integers.",
        reason: `Δ = ${fmt(d)} = ${isqrt(Math.round(d))}² is a perfect square, so the roots are rational and the AC method finds whole-number factors.` };
    }
    if (isWhole) {
      return { over_reals: true, over_integers: false, verdict: "Yes, over the real numbers, but not over the integers.",
        reason: `Δ = ${fmt(d)} > 0 isn't a perfect square, so the roots (−b ± √Δ) / 2a are irrational.` };
    }
    return { over_reals: true, over_integers: false, verdict: "Yes: it factors over the real numbers.",
      reason: `Δ = ${fmt(d)} > 0, so there are two real roots r₁, r₂ and y = a(x − r₁)(x − r₂).` };
  }

  const discriminantStep = (a, b, c, d, note = "") => step("Check the discriminant", `Δ = b² − 4ac = ${p_(b)}² − 4·${p_(a)}·${p_(c)} = ${fmt(d)}${note}`);

  function acMethodSteps(a, b, c, d) {
    const root = isqrt(d);
    const steps = [discriminantStep(a, b, c, d, d === 0 ? ", so it is a perfect square trinomial" : ` = ${root}², a perfect square`)];
    const g = gcd(a, b, c) * (a < 0 ? -1 : 1);
    const [a1, b1, c1] = [a / g, b / g, c / g];
    const prefix = coef(g);
    if (g !== 1) steps.push(step("Factor out the greatest common factor", `y = ${prefix}(${poly(a1, b1, c1)})`));
    if (c1 === 0) {
      steps.push(step("No constant term: factor out x", `${poly(a1, b1, 0)} = x${binomial(a1, b1)}`));
      steps.push(step("Set each factor to 0", `x = 0,  x = ${fmt(-b1 / a1)}`));
      return [steps, `y = ${prefix}x${binomial(a1, b1)}`];
    }
    const [m, n] = acMethod(a1, b1, c1).map(Math.round);
    steps.push(step("AC method: find m and n", `m·n = a·c = ${a1}·${p_(c1)} = ${a1 * c1}  and  m + n = b = ${b1}  →  m = ${m}, n = ${n}`));
    steps.push(step("Split the middle term", `${coef(a1, "x²")}${term(m, "x")}${term(n, "x")}${signed(c1)}`));
    const g1 = gcd(a1, m);
    const [p, q] = [a1 / g1, m / g1];
    const g2 = n / p;
    steps.push(step("Group the pairs and factor each", `${coef(g1, "x")}${binomial(p, q)}${term(g2)}${binomial(p, q)}`));
    // The two factors, ordered by the root each gives (smallest first, as in a(x − r₁)(x − r₂)).
    const pairs = [[-g2 / g1, binomial(g1, g2)], [-q / p, binomial(p, q)]].sort((s, t) => s[0] - t[0]);
    const factors = pairs[0][1] === pairs[1][1] ? `${pairs[0][1]}²` : `${pairs[0][1]}${pairs[1][1]}`;
    steps.push(step("Factor out the common binomial", factors));
    const zeros = pairs.map(([z]) => fmt(z));
    steps.push(step("Set each factor to 0", zeros[0] === zeros[1] ? `x = ${zeros[0]}` : `x = ${zeros[0]},  x = ${zeros[1]}`));
    return [steps, `y = ${prefix}${factors}`];
  }

  function factoringSteps(a, b, c, quadratic, info) {
    const d = quadratic.discriminant;
    if (!info.over_reals) {
      const z = quadratic.roots[1];
      return [[
        discriminantStep(a, b, c, d, " < 0"),
        step("Stop: no real factors", `The roots are complex, z = ${fmt(z.re)} ± ${fmt(z.im)}i, so over the complex numbers only: a(x − z₁)(x − z₂).`),
      ], null];
    }
    if (info.over_integers) return acMethodSteps(Math.round(a), Math.round(b), Math.round(c), Math.round(d));
    const xs = quadratic.x_intercepts;
    const [r1, r2] = [xs[0][0], xs[xs.length - 1][0]];
    const note = [a, b, c].every(whole) && d > 0 ? " isn't a perfect square" : "";
    const roots = r1 === r2 ? `r = −b / 2a = ${fmt(r1)}` : `r₁ = ${fmt(r1)},  r₂ = ${fmt(r2)}`;
    return [[
      discriminantStep(a, b, c, d, note),
      step("Find the roots with the quadratic formula", `r = (−b ± √Δ) / 2a = (${fmt(-b)} ± √${fmt(d)}) / ${p_(2 * a)}  →  ${roots}`),
      step("Write a(x − r₁)(x − r₂)", quadratic.factored_form),
    ], quadratic.factored_form];
  }

  // ---- Converting to the other forms ----------------------------------------
  const rootsText = (r1, r2) => (r1 === r2 ? `r₁ = r₂ = ${fmt(r1)}` : `r₁ = ${fmt(r1)},  r₂ = ${fmt(r2)}`);

  function conversions(form, a, p, q, std, vtx, fac, texts, d) {
    const { b, c } = std, { h, k } = vtx;
    const out = [];
    if (form === "standard") {
      out.push({ to: "vertex", title: "Standard → vertex form (complete the square)", result: texts.vertex, steps: [
        step("Find h, the axis of symmetry", `h = −b / 2a = −${p_(b)} / (2·${p_(a)}) = ${fmt(h)}`),
        step("Find k by substituting h", `k = ah² + bh + c = ${p_(a)}·${p_(h)}² + ${p_(b)}·${p_(h)} + ${p_(c)} = ${fmt(k)}`),
        step("Write a(x − h)² + k", texts.vertex),
      ] });
      const steps = [discriminantStep(a, b, c, d)];
      if (fac === null) steps.push(step("Δ < 0: no real roots", "The parabola never crosses the x-axis, so there is no real factored form."));
      else {
        steps.push(step("Use the quadratic formula", `r = (−b ± √Δ) / 2a = (${fmt(-b)} ± √${fmt(d)}) / ${p_(2 * a)}  →  ${rootsText(fac.r1, fac.r2)}`));
        steps.push(step("Write a(x − r₁)(x − r₂)", texts.factored));
      }
      out.push({ to: "factored", title: "Standard → factored form (find the roots)", result: texts.factored, steps });
    } else if (form === "vertex") {
      out.push({ to: "standard", title: "Vertex → standard form (expand)", result: texts.standard, steps: [
        step("Expand the square", `(x − h)² = x² − 2hx + h²  →  y = ${coef(a, "")}(${poly(1, -2 * h, h * h)})${clean(k) ? signed(k) : ""}`),
        step("Collect the coefficients", `b = −2ah = −2·${p_(a)}·${p_(h)} = ${fmt(b)},  c = ah² + k = ${p_(a)}·${p_(h)}² + ${p_(k)} = ${fmt(c)}`),
        step("Write ax² + bx + c", texts.standard),
      ] });
      const square = clean(-k / a);
      const steps = [step("Set y = 0 and isolate the square", `(x − h)² = −k / a = −${p_(k)} / ${p_(a)} = ${fmt(square)}`)];
      if (fac === null) steps.push(step("A square can't be negative", `(x − h)² = ${fmt(square)} has no real solution, so there is no real factored form.`));
      else {
        steps.push(step("Take the square root", `x = h ± √(−k / a) = ${fmt(h)} ± √${fmt(square)}  →  ${rootsText(fac.r1, fac.r2)}`));
        steps.push(step("Write a(x − r₁)(x − r₂)", texts.factored));
      }
      out.push({ to: "factored", title: "Vertex → factored form (solve for the roots)", result: texts.factored, steps });
    } else {
      out.push({ to: "standard", title: "Factored → standard form (multiply out)", result: texts.standard, steps: [
        step("Multiply the factors", `(x − r₁)(x − r₂) = x² − (r₁ + r₂)x + r₁r₂  →  y = ${coef(a, "")}(${poly(1, -(p + q), p * q)})`),
        step("Collect the coefficients", `b = −a(r₁ + r₂) = −${p_(a)}·(${fmt(p)} + ${p_(q)}) = ${fmt(b)},  c = a·r₁·r₂ = ${p_(a)}·${p_(p)}·${p_(q)} = ${fmt(c)}`),
        step("Write ax² + bx + c", texts.standard),
      ] });
      out.push({ to: "vertex", title: "Factored → vertex form (midway between the roots)", result: texts.vertex, steps: [
        step("h is midway between the roots", `h = (r₁ + r₂) / 2 = (${fmt(p)} + ${p_(q)}) / 2 = ${fmt(h)}`),
        step("k is the height there", `k = a(h − r₁)(h − r₂) = ${p_(a)}·(${fmt(h)} − ${p_(p)})·(${fmt(h)} − ${p_(q)}) = ${fmt(k)}`),
        step("Write a(x − h)² + k", texts.vertex),
      ] });
    }
    return out;
  }

  /** Same shape as FactoringSolution.to_dict() in Python. */
  function solve(form, a, p, q) {
    if (a === 0) throw new Error("'a' must be non-zero; with a = 0 the equation is linear, not quadratic.");
    let b, c, h, k;
    [a, b, c] = toStandard(form, a, p, q);
    const quadratic = Quad.solve(a, b, c);
    if (form === "vertex") [h, k] = [p, q];
    else [, h, k] = form === "factored" ? convertFactoredFormToVertexForm(a, p, q) : convertStandardFormToVertexForm(a, b, c);
    const vtx = { a, h: clean(h), k: clean(k) };
    const xs = quadratic.x_intercepts.map(([x]) => x);
    let fac = null;
    if (form === "factored") fac = { a, r1: Math.min(p, q), r2: Math.max(p, q) };
    else if (xs.length) fac = { a, r1: xs[0], r2: xs[xs.length - 1] };
    const texts = Object.fromEntries(FORMS.map((name) => [name, quadratic[`${name}_form`]]));
    const std = { a, b, c };
    const info = factorability(a, b, c, quadratic.discriminant, quadratic.root_nature);
    const [steps, result] = factoringSteps(a, b, c, quadratic, info);
    return {
      form,
      inputs: Object.fromEntries(PARAMS[form].map((name, i) => [name, [a, p, q][i]])),
      standard: std,
      vertex: vtx,
      factored: fac,
      forms: texts,
      quadratic,
      factorable: info,
      conversions: conversions(form, a, p, q, std, vtx, fac, texts, quadratic.discriminant),
      factoring: steps,
      factored_result: result,
    };
  }

  const api = {
    solve, fmt, FORMS, PARAMS, to_standard: toStandard,
    factored_form: factoredForm, vertex_form: vertexForm, ac_method: acMethod,
    convert_standard_form_to_factored_form: convertStandardFormToFactoredForm,
    convert_vertex_form_to_factored_form: convertVertexFormToFactoredForm,
    convert_factored_form_to_standard_form: convertFactoredFormToStandardForm,
    convert_standard_form_to_vertex_form: convertStandardFormToVertexForm,
    convert_vertex_form_to_standard_form: convertVertexFormToStandardForm,
    convert_factored_form_to_vertex_form: convertFactoredFormToVertexForm,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else global.FactorMath = api;
})(typeof window !== "undefined" ? window : globalThis);
