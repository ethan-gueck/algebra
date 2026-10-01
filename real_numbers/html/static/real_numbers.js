/*
 * real_numbers.js — page controller for properties of real numbers.
 *
 * Three live sections, all computed by RealMath (real_numbers_math.js): the
 * properties explorer, the order-of-operations stepper, and the solar-altitude
 * grouping demo. The first render uses the Python-built config.
 * The URL hash (#a=0.1&b=0.2&c=0.3) presets the explorer.
 */
(function () {
  "use strict";
  const M = window.RealMath;
  const config = JSON.parse(document.getElementById("pp-config").textContent);
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));

  /** A float exactly as the computer holds it (shortest round-trip form), with a true minus sign. */
  const flt = (x) => (Object.is(x, -0) ? "−0" : String(x).replace("-", "−"));
  const mark = (ok, yes, no) => `<span class="rn-mark ${ok ? "is-ok" : "is-bad"}">${ok ? "✓" : "✗"} ${ok ? yes : no}</span>`;

  function guard(errorId, fn) {
    const box = $(errorId);
    try { fn(); box.hidden = true; } catch (err) { box.textContent = err.message; box.hidden = false; }
  }

  // ---- Properties explorer --------------------------------------------------
  function renderProperties(rows) {
    $("props").innerHTML = rows.map((r) => {
      const head = `<th scope="row"><span class="rn-name">${r.name}</span><span class="rn-rule">${r.rule}</span></th>`;
      if (!r.applies) return `<tr>${head}<td colspan="2" class="rn-na">Needs a ≠ 0: zero has no reciprocal.</td></tr>`;
      const exact = `<code>${esc(r.left)}</code> = ${esc(r.exact[0])}<br><code>${esc(r.right)}</code> = ${esc(r.exact[1])}`;
      const off = r.float.some((f, i) => f !== r.exact_float[i]);
      const float = `<code>${esc(r.left)}</code> → ${flt(r.float[0])}<br><code>${esc(r.right)}</code> → ${flt(r.float[1])}`;
      // A property holds in floating point when both sides match; they can still share a rounding error.
      const verdict = r.float_holds
        ? mark(true, off ? `holds, though both sides carry the same rounding error (exact: ${esc(r.exact[0])})` : "holds", "")
        : mark(false, "", `fails: the two sides differ by ${flt(Math.abs(r.float[0] - r.float[1]))}`);
      return `<tr class="${r.float_holds ? "" : "is-broken"}">${head}<td>${exact}<br>${mark(r.exact_holds, "holds", "fails")}</td><td>${float}<br>${verdict}</td></tr>`;
    }).join("");
  }

  const props = () => [$("a").value, $("b").value, $("c").value];
  function updateProperties(rows) {
    guard("props-error", () => {
      renderProperties(rows || M.properties(...props()));
      const values = props().map(Number);
      if (values.every(Number.isFinite) && props().every((v) => !v.includes("/"))) PPParams.write({ a: props()[0], b: props()[1], c: props()[2] });
    });
  }

  // ---- Order of operations --------------------------------------------------
  const BADGE = { Exponent: "E", Negation: "E", Multiplication: "M", Division: "D", Addition: "A", Subtraction: "S" };
  function renderOrder(r) {
    $("ops-start").innerHTML = `<span class="rn-label">Start</span> <code>${esc(r.start)}</code>`;
    $("ops-steps").innerHTML = r.steps.map((s) => {
      const badge = s.parentheses ? "P" : BADGE[s.rule];
      const where = s.parentheses ? `${s.rule} inside parentheses` : s.rule;
      return `<li class="steps__item"><p class="steps__title"><span class="rn-badge">${badge}</span>${where}</p>` +
        `<p class="steps__math">${esc(s.work)} &nbsp;→&nbsp; <code>${esc(s.expression)}</code></p></li>`;
    }).join("") || `<li class="steps__item"><p class="steps__title">Nothing to do</p><p class="steps__math">It's already a single number.</p></li>`;
    const exactFloat = Number(r.result.replace("−", "-"));
    const same = !r.result.includes("/") ? exactFloat === r.value : null;
    $("ops-result").innerHTML =
      `<dt>Exact answer</dt><dd><strong>${esc(r.result)}</strong></dd>` +
      `<dt>Floating point</dt><dd>${flt(r.value)}${same === false ? ` <span class="rn-mark is-bad">✗ off by ${flt(Math.abs(exactFloat - r.value))}</span>` : ""}</dd>`;
  }
  function updateOrder(r) { guard("ops-error", () => renderOrder(r || M.order_of_operations($("expr").value))); }

  // ---- Grouping demo --------------------------------------------------------
  const angle = (deg) => (deg === null ? "no angle: arcsin only accepts −1 to 1" : `${flt(deg)}°`);
  function verdict(deg, exactDeg) {
    if (deg === null) return mark(false, "", "impossible: sin can't exceed 1");
    if (deg < 0 && exactDeg >= 0) return mark(false, "", "impossible: below the horizon");
    if (deg !== exactDeg) return mark(false, "", "off from the exact value");
    return mark(true, "correct", "");
  }
  function renderSum(r) {
    // Each term as typed, negatives in parentheses so "+ (−0.4)" reads clearly.
    const [t1, t2, t3] = [$("t1").value, $("t2").value, $("t3").value].map((t) => {
      const s = esc(t.trim().replace("-", "−"));
      return s.startsWith("−") ? `(${s})` : s;
    });
    const ex = r.altitude.exact;
    const rows = [
      ["Exact (real numbers)", r.exact, angle(ex), mark(true, "the true answer", "")],
      [`(t₁ + t₂) + t₃ = (${t1} + ${t2}) + ${t3}`, flt(r.left), angle(r.altitude.left), verdict(r.altitude.left, ex)],
      [`t₁ + (t₂ + t₃) = ${t1} + (${t2} + ${t3})`, flt(r.right), angle(r.altitude.right), verdict(r.altitude.right, ex)],
      ["Guarded: snap and clamp, then arcsin", "", `${flt(r.guarded.left)}° and ${flt(r.guarded.right)}°`,
        mark(r.guarded.left === ex && r.guarded.right === ex, "both correct", "still off")],
    ];
    $("sum").innerHTML = rows.map(([how, s, alt, ok]) => `<tr><th scope="row">${how}</th><td><code>${s}</code></td><td>${alt}</td><td>${ok}</td></tr>`).join("");
  }
  function updateSum(r) { guard("sum-error", () => renderSum(r || M.sum_two_ways($("t1").value, $("t2").value, $("t3").value))); }

  // ---- Wiring ---------------------------------------------------------------
  const init = config.initial;
  [["a", init.a], ["b", init.b], ["c", init.c], ["expr", init.expr], ["t1", init.terms[0]], ["t2", init.terms[1]], ["t3", init.terms[2]]]
    .forEach(([id, v]) => { $(id).value = v; });
  const hash = PPParams.read(["a", "b", "c"]);
  const fromHash = Object.keys(hash).length > 0;
  Object.entries(hash).forEach(([k, v]) => { $(k).value = String(v); });

  ["a", "b", "c"].forEach((id) => $(id).addEventListener("input", () => updateProperties()));
  $("expr").addEventListener("input", () => updateOrder());
  ["t1", "t2", "t3"].forEach((id) => $(id).addEventListener("input", () => updateSum()));
  const preset = (attr, ids, after) => document.querySelectorAll(`[data-${attr}]`).forEach((button) => {
    button.addEventListener("click", () => { button.dataset[attr].split(",").forEach((v, i) => { $(ids[i]).value = v; }); after(); });
  });
  preset("props", ["a", "b", "c"], () => updateProperties());
  preset("sum", ["t1", "t2", "t3"], () => updateSum());
  document.querySelectorAll("[data-expr]").forEach((button) => {
    button.addEventListener("click", () => { $("expr").value = button.dataset.expr; updateOrder(); });
  });
  window.addEventListener("hashchange", () => {
    const values = PPParams.read(["a", "b", "c"]);
    if (!Object.keys(values).length) return;
    Object.entries(values).forEach(([k, v]) => { $(k).value = String(v); });
    updateProperties();
  });

  updateProperties(fromHash ? null : config.solution.properties);
  updateOrder(config.solution.order);
  updateSum(config.solution.sum);
})();
