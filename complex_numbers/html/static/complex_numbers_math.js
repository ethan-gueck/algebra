/*
 * complex_numbers_math.js — browser mirror of complex_numbers/solver.py and the A2.3 section of core/formula.py.
 *
 * JavaScript has no complex type, so a complex number is { re, im }, multiplied
 * exactly as Python multiplies complex numbers. Loaded after a1's
 * quadratic_math.js (window.QuadMath) for fmt. Python stays the source of truth:
 * tests/test_js_parity.py runs this file and compares solve() with the Python output.
 * Exposes window.ComplexMath (browser) or module.exports (Node).
 */
(function (global) {
  "use strict";
  const { fmt } = global.QuadMath;

  // ---- complex arithmetic (Python's complex type) --------------------------------
  const mul = (z, w) => ({ re: z.re * w.re - z.im * w.im, im: z.re * w.im + z.im * w.re });

  // ---- core/formula.py: A2.3 Complex Numbers -------------------------------------
  const complexToReal = (i) => mul(i, i);
  const complexStandardForm = (a, b) => ({ re: a, im: b });
  const complexConjugate = (z) => ({ re: z.re, im: -z.im });
  const complexModulus = (z) => Math.hypot(z.re, z.im);

  // ---- complex_numbers/solver.py ---------------------------------------------------
  const clean = (v) => { const r = Number(v.toFixed(10)); return r === 0 ? 0 : r; };
  const p_ = (v) => (clean(v) < 0 ? `(${fmt(v)})` : fmt(v));
  const I = complexStandardForm(0, 1);
  const pair = (z) => ({ re: clean(z.re), im: clean(z.im) });

  function text(z) {
    const [a, b] = [clean(z.re), clean(z.im)];
    if (b === 0) return fmt(a);
    const imaginary = Math.abs(b) === 1 ? "i" : `${fmt(Math.abs(b))}i`;
    if (a === 0) return b > 0 ? imaginary : `−${imaginary}`;
    return `${fmt(a)} ${b < 0 ? "−" : "+"} ${imaginary}`;
  }

  function kind(a, b) {
    [a, b] = [clean(a), clean(b)];
    if (a === 0 && b === 0) return "zero: the origin";
    if (b === 0) return "real: on the real axis (b = 0)";
    if (a === 0) return "purely imaginary: on the imaginary axis (a = 0)";
    const quadrant = a > 0 ? (b > 0 ? "I" : "IV") : (b > 0 ? "II" : "III");
    return `complex: quadrant ${quadrant}`;
  }

  function powers() {
    const values = [];
    let z = complexStandardForm(1, 0);
    for (let n = 0; n < 5; n++) {
      values.push({ n, value: pair(z), text: text(z) });
      z = mul(z, I);
    }
    return values;
  }

  function steps(a, b, z, conjugate, modulus, product) {
    const square = complexToReal(I);
    const worked = (aText, sign, b, z) => {
      const raw = `${aText} ${sign} ${p_(b)}i`;
      return raw === text(z) ? raw : `${raw} = ${text(z)}`;
    };
    return [
      { id: "i", title: "The imaginary unit: i² = −1", math: `i · i = i² = ${fmt(square.re)}: i is the number whose square is −1, so √−1 = i` },
      { id: "z", title: "Standard form: z = a + bi", math: `z = ${worked(fmt(a), "+", b, z)}: real part a = ${fmt(a)}, imaginary part b = ${fmt(b)}` },
      { id: "conjugate", title: "Conjugate: z̄ = a − bi", math: `z̄ = ${worked(fmt(a), "−", b, conjugate)}: flip the sign of the imaginary part, a mirror image across the real axis` },
      { id: "modulus", title: "Modulus: |z| = √(a² + b²)", math: `|z| = √(${p_(a)}² + ${p_(b)}²) = √${fmt(a * a + b * b)} = ${fmt(modulus)}: the distance from 0 to z` },
      { id: "product", title: "Together: z · z̄ = a² + b² = |z|²", math: `(${text(z)})(${text(conjugate)}) = a² − b²·i² = ${fmt(a * a)} + ${fmt(b * b)} = ${fmt(product.re)}, a real number` },
    ];
  }

  /** Same shape as ComplexSolution.to_dict() in Python. */
  function solve(a, b) {
    const z = complexStandardForm(a, b);
    const conjugate = complexConjugate(z);
    const modulus = clean(complexModulus(z));
    const product = mul(z, conjugate);
    return {
      inputs: { a, b },
      z: pair(z),
      conjugate: pair(conjugate),
      modulus,
      product: pair(product),
      texts: { z: text(z), conjugate: text(conjugate), modulus: fmt(modulus), product: text(product) },
      kind: kind(a, b),
      powers: powers(),
      steps: steps(a, b, z, conjugate, modulus, product),
    };
  }

  const api = {
    solve, fmt, text,
    complex_to_real: complexToReal, complex_standard_form: complexStandardForm,
    complex_conjugate: complexConjugate, complex_modulus: complexModulus,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else global.ComplexMath = api;
})(typeof window !== "undefined" ? window : globalThis);
