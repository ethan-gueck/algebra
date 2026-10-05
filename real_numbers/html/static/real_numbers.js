/*
 * real_numbers.js — page controller for properties of real numbers.
 *
 * Five live sections, all computed by RealMath (real_numbers_math.js): the
 * properties explorer, the order-of-operations stepper, the solar-altitude
 * grouping demo (A1.1), the exponent rules (A1.2), and ratios, proportions and
 * percent change (A1.14). The first render uses the Python-built config.
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
  /** One table row per rule: both sides exactly and in floating point (properties and exponent rules). */
  function renderRules(tbody, rows) {
    $(tbody).innerHTML = rows.map((r) => {
      const head = `<th scope="row"><span class="rn-name">${r.name}</span><span class="rn-rule">${r.rule}</span></th>`;
      if (!r.applies) return `<tr>${head}<td colspan="2" class="rn-na">${r.note || "Needs a ≠ 0: zero has no reciprocal."}</td></tr>`;
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
      renderRules("props", rows || M.properties(...props()));
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

  // ---- Exponent rules ---------------------------------------------------------
  function updateExponents(rows) {
    guard("exp-error", () => renderRules("exp", rows || M.exponent_rules($("ea").value, $("em").value, $("en").value)));
  }

  // ---- Ratios, proportions and percent change --------------------------------
  function renderRatio(r) {
    const off = r.float_holds !== r.exact_holds;
    $("ratio").innerHTML =
      `<dt>Ratios</dt><dd><code>${esc(r.left)}</code> = <code>${esc(r.simplest[0])}</code> and <code>${esc(r.right)}</code> = <code>${esc(r.simplest[1])}</code> in lowest terms</dd>` +
      `<dt>Divided</dt><dd>${esc(r.exact[0])} and ${esc(r.exact[1])} ${mark(r.exact_holds, "in proportion", "not in proportion")}</dd>` +
      `<dt>Cross products</dt><dd><span class="var">a</span>·<span class="var">d</span> = ${esc(r.cross[0])}, <span class="var">b</span>·<span class="var">c</span> = ${esc(r.cross[1])}</dd>` +
      `<dt>Floating point</dt><dd>${flt(r.float[0])} and ${flt(r.float[1])} ` +
      (off ? mark(false, "", r.exact_holds ? "says not in proportion: a ÷ b rounded differently" : "says in proportion")
           : mark(true, r.float_holds ? "agrees: in proportion" : "agrees: not in proportion", "")) + `</dd>`;
  }
  function updateRatio(r) { guard("ratio-error", () => renderRatio(r || M.proportion($("ra").value, $("rb").value, $("rc").value, $("rd").value))); }

  /** An exact percentage: '50%', or '−100/3% ≈ −33.33%' when it doesn't terminate. */
  const pct = (text, value) => (text.includes("/") ? `${esc(text)}% ≈ ${flt(Number(value.toFixed(2)))}%` : `${esc(text)}%`);
  function renderPercent(r) {
    const sign = r.direction === "increase" ? "+" : "";
    const exactFloat = r.exact_value;
    $("pct").innerHTML =
      `<dt>Change</dt><dd><strong>${sign}${pct(r.exact, r.exact_value)}</strong> (${r.direction})</dd>` +
      `<dt>Floating point</dt><dd>${flt(r.float)}%` + (r.float !== exactFloat && !r.exact.includes("/") ? ` <span class="rn-mark is-bad">✗ off by ${flt(Math.abs(exactFloat - r.float))}</span>` : "") + `</dd>` +
      `<dt>To undo it</dt><dd>${r.undo === null ? "Impossible: nothing is a percentage of 0." : `${r.undo_value > 0 ? "+" : ""}${pct(r.undo, r.undo_value)}, measured from the new value`}</dd>`;
  }
  function updatePercent(r) { guard("pct-error", () => renderPercent(r || M.percent_change($("po").value, $("pn").value))); }

  // ---- Wiring ---------------------------------------------------------------
  const init = config.initial;
  [["a", init.a], ["b", init.b], ["c", init.c], ["expr", init.expr], ["t1", init.terms[0]], ["t2", init.terms[1]], ["t3", init.terms[2]],
    ["ea", init.exponents[0]], ["em", init.exponents[1]], ["en", init.exponents[2]],
    ["ra", init.ratio[0]], ["rb", init.ratio[1]], ["rc", init.ratio[2]], ["rd", init.ratio[3]], ["po", init.percent[0]], ["pn", init.percent[1]]]
    .forEach(([id, v]) => { $(id).value = v; });
  const hash = PPParams.read(["a", "b", "c"]);
  const fromHash = Object.keys(hash).length > 0;
  Object.entries(hash).forEach(([k, v]) => { $(k).value = String(v); });

  ["a", "b", "c"].forEach((id) => $(id).addEventListener("input", () => updateProperties()));
  $("expr").addEventListener("input", () => updateOrder());
  ["t1", "t2", "t3"].forEach((id) => $(id).addEventListener("input", () => updateSum()));
  ["ea", "em", "en"].forEach((id) => $(id).addEventListener("input", () => updateExponents()));
  ["ra", "rb", "rc", "rd"].forEach((id) => $(id).addEventListener("input", () => updateRatio()));
  ["po", "pn"].forEach((id) => $(id).addEventListener("input", () => updatePercent()));
  const preset = (attr, ids, after) => document.querySelectorAll(`[data-${attr}]`).forEach((button) => {
    button.addEventListener("click", () => { button.dataset[attr].split(",").forEach((v, i) => { $(ids[i]).value = v; }); after(); });
  });
  preset("props", ["a", "b", "c"], () => updateProperties());
  preset("sum", ["t1", "t2", "t3"], () => updateSum());
  preset("exp", ["ea", "em", "en"], () => updateExponents());
  preset("ratio", ["ra", "rb", "rc", "rd"], () => updateRatio());
  preset("pct", ["po", "pn"], () => updatePercent());
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
  updateExponents(config.solution.exponents);
  updateRatio(config.solution.ratio);
  updatePercent(config.solution.percent);
})();
