/*
 * factoring.js — page controller for factoring a quadratic.
 *
 * Reads the Python-built config, wires the form drop-down and the three sliders,
 * and turns a solution into a Manim-style Timeline: the parabola, its axis of
 * symmetry and vertex, the y-intercept and the roots the factors come from.
 * Changing the form rewrites the same parabola in the new form's variables, and
 * a = 0 shows the line the parabola flattens into, so sliders pass straight
 * through it. Slider moves are drawn once per animation frame. The
 * URL hash (#a=2&b=1&c=-6, #a=1&h=1.5&k=-0.25 or #a=-1&r1=-2&r2=3) presets the
 * quadratic and is watched, so links and PP.embed(...).set() update the page live.
 */
(function () {
  "use strict";
  const { ManimCanvas, Timeline, rate, view } = window.Manim;
  const { solve, fmt, PARAMS, to_standard: toStandard } = window.FactorMath;
  const { framing, solve_linear: solveLinear } = window.QuadMath;

  const config = JSON.parse(document.getElementById("pp-config").textContent);
  const C = Object.fromEntries(Object.entries(config.roles).map(([el, role]) => [el, config.theme.stage[role]]));
  const SLOTS = ["p0", "p1", "p2"];

  const $ = (id) => document.getElementById(id);
  const el = {
    play: $("play"), finish: $("finish"), scrub: $("scrub"), speed: $("speed"), narration: $("narration"),
    run: $("run"), error: $("error"), warning: $("warning"), note: $("note"), form: $("form"), formAbout: $("form-about"),
    paramTerms: $("param-terms"), forms: $("forms"), results: $("results"), glossary: $("glossary"),
    verdict: $("verdict"), verdictReason: $("verdict-reason"), factoredResult: $("factored-result"),
    factoring: $("factoring"), conversions: $("conversions"),
  };
  const IDLE = "Press run to animate.";

  const FORM_INFO = {
    standard: {
      name: "Standard form", general: "y = ax² + bx + c",
      about: "Shows the y-intercept c; the discriminant b² − 4ac comes straight from its coefficients.",
      vars: [["a", "leading coefficient: width, and up (a > 0) or down (a < 0)"], ["b", "linear coefficient: with a, sets the axis x = −b / 2a"], ["c", "constant term: the y-intercept (0, c)"]],
    },
    vertex: {
      name: "Vertex form", general: "y = a(x − h)² + k",
      about: "Shows the turning point (h, k), the parabola's minimum or maximum.",
      vars: [["a", "leading coefficient: width, and up or down"], ["h", "x of the vertex, and the axis of symmetry x = h"], ["k", "y of the vertex: the minimum (a > 0) or maximum (a < 0)"]],
    },
    factored: {
      name: "Factored form", general: "y = a(x − r₁)(x − r₂)",
      about: "Shows the roots r₁ and r₂, where the parabola crosses the x-axis. It exists only when the roots are real.",
      vars: [["a", "leading coefficient: width, and up or down"], ["r₁", "first root: y = 0 at x = r₁"], ["r₂", "second root: y = 0 at x = r₂"]],
    },
  };
  const TERMS = {
    "Discriminant Δ": "Δ = b² − 4ac. Positive: two real roots. Zero: one repeated root. Negative: no real roots, so no real factors.",
    "Vertex (h, k)": "The turning point, h = −b / 2a and k = f(h); the minimum when a > 0, the maximum when a < 0.",
    "Axis of symmetry": "The vertical line x = h through the vertex; the parabola mirrors itself across it.",
    "Roots": "The x where y = 0: the r₁, r₂ of the factored form, so each root x = r gives a factor (x − r).",
    "y-intercept": "Where the parabola crosses the y-axis: (0, c).",
    "Opens": "Up when a > 0, down when a < 0.",
    "AC method": "For whole-number a, b, c: find m, n with m·n = ac and m + n = b, split bx into mx + nx and factor by grouping.",
  };

  const state = { ...config.initial, show: {} };
  document.querySelectorAll("[data-show]").forEach((box) => { state.show[box.dataset.show] = box.checked; });

  const scene = new ManimCanvas($("scene"), { theme: config.theme, view: config.solution.quadratic.window });
  let timeline = null;
  let current = null;

  const point = (x, y) => `(${fmt(x)}, ${fmt(y)})`;
  const swatch = (color) => `<span class="swatch" style="background:${color}"></span>`;
  const values = () => [state.a, state.p, state.q];
  const tidy = (v) => Number(Number(v).toFixed(4));
  /** Replace a node's HTML only when it changed, so slider drags don't rebuild identical panels. */
  const written = new WeakMap();
  const setHTML = (node, markup) => { if (written.get(node) !== markup) { node.innerHTML = markup; written.set(node, markup); } };

  /** a = 0: no x² term, so the "parabola" is the line y = bx + c (or a constant). Same shape as solve(), marked linear. */
  function linearSolution(form, p, q) {
    const [, b, c] = toStandard(form, 0, p, q);
    const line = solveLinear(b, c);
    return {
      linear: true, form, standard: { a: 0, b, c }, vertex: null, factored: null, quadratic: line,
      forms: { standard: line.standard_form, vertex: null, factored: null },
      factorable: {
        over_reals: false, over_integers: false, verdict: "Not a quadratic: with a = 0 it's a line.",
        reason: `There is no x² term, so ${line.standard_form} has no parabola to factor. Move a away from 0 to bring it back.`,
      },
      factoring: [{ title: "a = 0: the x² term drops out", math: `y = 0·x²${b ? ` ${b < 0 ? "−" : "+"} ${fmt(Math.abs(b))}x` : ""}${c ? ` ${c < 0 ? "−" : "+"} ${fmt(Math.abs(c))}` : ""}  →  ${line.standard_form}: ${line.root_nature}` }],
      factored_result: null, conversions: [],
    };
  }

  const complex = (z) => `${fmt(z.re)} ${z.im < 0 ? "−" : "+"} ${fmt(Math.abs(z.im))}i`;

  function renderGlossary() {
    el.glossary.innerHTML = Object.entries(TERMS).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("");
  }

  // ---- The chosen form and its variables -----------------------------------
  function renderFormControls() {
    const info = FORM_INFO[state.form];
    el.form.value = state.form;
    el.formAbout.innerHTML = `<span class="form-general">${info.general}</span> ${info.about}`;
    info.vars.forEach(([sym], i) => { $(`${SLOTS[i]}-label`).innerHTML = `<span class="var">${sym}</span>`; });
    $("p0-range").setAttribute("aria-label", `${info.vars[0][0]} slider`);
    $("p1-range").setAttribute("aria-label", `${info.vars[1][0]} slider`);
    $("p2-range").setAttribute("aria-label", `${info.vars[2][0]} slider`);
    el.paramTerms.innerHTML = info.vars.map(([sym, meaning], i) =>
      `<dt><span class="var">${sym}</span> = <span id="${SLOTS[i]}-value">${fmt(values()[i])}</span></dt><dd>${meaning}</dd>`).join("");
  }

  function syncInputs() {
    values().forEach((v, i) => {
      $(`${SLOTS[i]}-range`).value = v;
      $(`${SLOTS[i]}-num`).value = v;
      const shown = $(`${SLOTS[i]}-value`);
      if (shown) shown.textContent = fmt(v);
    });
  }

  /** Rewrite the current parabola in another form's variables, so switching forms keeps the same curve. */
  function switchForm(next) {
    el.note.hidden = true;
    if (current) {
      if (next === "standard") [state.p, state.q] = [current.standard.b, current.standard.c];
      else if (current.linear) [state.p, state.q] = next === "vertex" ? [0, current.standard.c] : [-1, 1];
      else if (next === "vertex") [state.p, state.q] = [current.vertex.h, current.vertex.k];
      else if (current.factored) [state.p, state.q] = [current.factored.r1, current.factored.r2];
      else {
        const h = Math.round(current.vertex.h);
        [state.p, state.q] = [h - 1, h + 1];
        el.note.textContent = `${current.forms.standard} has no real roots, so it has no factored form. Starting from r₁ = ${h - 1}, r₂ = ${h + 1} instead.`;
        el.note.hidden = false;
      }
      [state.p, state.q] = [tidy(state.p), tidy(state.q)];
    }
    state.form = next;
    renderFormControls();
    syncInputs();
  }

  // ---- Panels -----------------------------------------------------------------
  function renderForms(sol) {
    setHTML(el.forms, ["standard", "vertex", "factored"].map((name) => {
      const text = sol.forms[name] || (sol.linear ? "none: a = 0 leaves a line" : "none: no real roots");
      return `<div class="forms-list__row${name === sol.form ? " is-chosen" : ""}"><dt>${FORM_INFO[name].name}</dt><dd>${text}</dd></div>`;
    }).join(""));
  }

  const rows = (items) => items.map(([id, k, v]) =>
    `<dt data-step="${id}" title="${TERMS[k] || ""}">${k}</dt><dd data-step="${id}">${v}</dd>`).join("");

  function renderResults(sol) {
    const quad = sol.quadratic;
    if (sol.linear) {
      const roots = quad.root === null ? quad.root_nature : `${swatch(C.roots)}x = ${fmt(quad.root)}`;
      setHTML(el.results, rows([
        ["curve", "Discriminant Δ", "none: a = 0, so this is a line, not a quadratic"],
        ["roots", "Roots", roots],
        ["intercepts", "y-intercept", `${swatch(C.y_intercept)}${point(...quad.y_intercept)}`],
      ]));
      return;
    }
    const [h, k] = quad.vertex;
    const roots = quad.x_intercepts.length
      ? quad.x_intercepts.map(([x]) => `${swatch(C.roots)}x = ${fmt(x)}`).join(",  ")
      : `none (complex: ${quad.roots.map(complex).join(", ")})`;
    setHTML(el.results, rows([
      ["factor", "Discriminant Δ", `${fmt(quad.discriminant)}: ${quad.root_nature}`],
      ["vertex", "Vertex (h, k)", `${swatch(C.vertex)}${point(h, k)}, the ${quad.direction === "up" ? "minimum" : "maximum"}`],
      ["symmetry", "Axis of symmetry", `${swatch(C.symmetry)}x = ${fmt(quad.axis_of_symmetry)}`],
      ["roots", "Roots", roots],
      ["intercepts", "y-intercept", `${swatch(C.y_intercept)}${point(...quad.y_intercept)}`],
      ["curve", "Opens", quad.direction],
    ]));
  }

  const stepList = (steps) => steps.map(({ title, math }) =>
    `<li class="steps__item"><p class="steps__title">${title}</p><p class="steps__math">${math}</p></li>`).join("");

  function renderFactoring(sol) {
    const info = sol.factorable;
    el.verdict.textContent = info.verdict;
    el.verdict.classList.toggle("verdict--no", !info.over_reals);
    el.verdictReason.textContent = info.reason;
    setHTML(el.factoredResult, sol.factored_result
      ? `<span class="verdict__label">Factored form</span> ${sol.factored_result}`
      : `<span class="verdict__label">Factored form</span> ${sol.linear ? "none: a = 0 leaves a line" : "none over the real numbers"}`);
    setHTML(el.factoring, stepList(sol.factoring));
  }

  function renderConversions(sol) {
    if (!sol.conversions.length) {
      setHTML(el.conversions, `<p class="conversion__empty">With a = 0 there is no parabola, so no vertex or factored form to convert to. Move <span class="var">a</span> away from 0.</p>`);
      return;
    }
    setHTML(el.conversions, sol.conversions.map((conv) => `
      <div class="conversion">
        <h3 class="conversion__title">${conv.title}</h3>
        <ol class="steps steps--compact">${stepList(conv.steps)}</ol>
        <p class="conversion__result">${conv.result || "no real factored form"}</p>
      </div>`).join(""));
  }

  function highlight(step) {
    el.narration.textContent = step ? step.caption : IDLE;
    document.querySelectorAll("[data-step]").forEach((node) => {
      node.classList.toggle("is-active", !!step && node.dataset.step === step.id);
    });
  }

  // ---- Timeline -------------------------------------------------------------
  function buildTimeline(sol) {
    const quad = sol.quadratic;
    const { a, b, c } = sol.standard;
    const [h, k] = sol.linear ? [0, c] : quad.vertex;
    const f = (x) => a * x * x + b * x + c;
    const show = state.show;
    const tl = new Timeline(scene, {
      onFrame: (t, total) => { el.scrub.value = total ? Math.round((t / total) * 1000) : 1000; },
      onStep: highlight,
      onDone: () => setPlaying(false),
    });
    tl.speed = Number(el.speed.value);

    if (show.grid) tl.add({ id: "curve", caption: "Set up the axes", duration: 0.8, draw: (p) => scene.grid(p) });
    tl.add({ id: "curve", caption: "Set up the axes", duration: 1.0, parallel: show.grid, draw: (p) => scene.axes(p) });
    tl.add({ id: "curve", caption: `Plot ${sol.forms[sol.form] || sol.forms.standard}`, duration: 1.8, wait: 0.2, draw: (p) => scene.curve(f, p, C.curve) });
    if (show.symmetry && !sol.linear) {
      tl.add({
        id: "symmetry", caption: `Axis of symmetry: x = h = ${fmt(h)}`, duration: 0.8,
        draw: (p) => {
          const v = scene.view;
          scene.line(h, v.y_min, h, v.y_max, p, C.symmetry, { dash: [8, 6] });
          if (show.labels) scene.label(`x = ${fmt(h)}`, h, v.y_max, p, C.symmetry, { dy: 14, dx: 6 });
        },
      });
    }
    const below = quad.direction === "up";
    if (!sol.linear) tl.add({
      id: "vertex", caption: `Vertex ${point(h, k)}: ${sol.forms.vertex}`, duration: 0.7,
      draw: (p) => {
        scene.dot(h, k, p, C.vertex);
        if (show.labels) scene.label(`vertex ${point(h, k)}`, h, k, p, C.vertex, { dy: below ? 22 : -22, dx: 0, align: "center" });
      },
    });
    if (!sol.linear) tl.add({ id: "vertex", duration: 0.6, parallel: true, rate: rate.linear, draw: (p) => scene.flash(h, k, p, C.vertex) });
    if (show.intercepts) {
      tl.add({
        id: "intercepts", caption: `y-intercept (0, ${fmt(c)})`, duration: 0.6,
        draw: (p) => {
          scene.dot(0, c, p, C.y_intercept);
          if (show.labels) scene.label(`(0, ${fmt(c)})`, 0, c, p, C.y_intercept, { dx: -10, align: "right" });
        },
      });
      const xs = quad.x_intercepts;
      xs.forEach(([x], i) => {
        const side = xs.length === 1
          ? { dx: -10, dy: below ? -20 : 20, align: "right" }
          : i === 0 ? { dx: -8, dy: 20, align: "right" } : { dx: 8, dy: 20, align: "left" };
        tl.add({
          id: "roots", caption: xs.length === 1 ? `Repeated root x = ${fmt(x)}: the factor (x − r) appears twice` : `Root r${i ? "₂" : "₁"} = ${fmt(x)}: a factor (x − r${i ? "₂" : "₁"})`,
          duration: 0.7,
          draw: (p) => {
            scene.dot(x, 0, p, C.roots);
            if (show.labels) scene.label(`x = ${fmt(x)}`, x, 0, p, C.roots, side);
          },
        });
        tl.add({ id: "roots", duration: 0.6, parallel: true, rate: rate.linear, draw: (p) => scene.flash(x, 0, p, C.roots) });
      });
      if (!xs.length) {
        tl.add({ id: "roots", caption: "No real roots: the curve never meets the x-axis", duration: 1.0, rate: rate.linear, draw: () => {} });
      }
    }
    tl.add({ id: "factor", caption: sol.factored_result ? `Factored: ${sol.factored_result}` : sol.factorable.verdict, duration: 1.2, rate: rate.linear, draw: () => {} });
    return tl;
  }

  // ---- Controls -------------------------------------------------------------
  function setPlaying(playing) { el.play.textContent = playing ? "❚❚ Pause" : "▶ Play"; }

  function frame(sol, { refit = false } = {}) {
    const { points, window: ideal } = framing(sol.quadratic);
    const target = refit ? view.roomy(ideal) : view.follow(scene.targetView, ideal, points);
    if (!target) return;
    scene.moveTo(target, { onFrame: () => { if (timeline && !timeline.playing) timeline.render(); } });
  }

  function showError(text) {
    el.error.textContent = text;
    el.error.hidden = false;
  }

  function update({ fromConfig = false, refit = false } = {}) {
    if (timeline) timeline.stop();
    setPlaying(false);
    if (values().some((v) => !Number.isFinite(v))) { el.warning.hidden = true; return showError("Enter a number for each variable."); }
    el.error.hidden = true;
    // a = 0 is the linear limit of the parabola, so sliders pass straight through it.
    const sol = fromConfig ? config.solution : state.a === 0 ? linearSolution(state.form, state.p, state.q) : solve(state.form, state.a, state.p, state.q);
    current = sol;
    el.warning.hidden = !sol.linear;
    if (sol.linear) el.warning.innerHTML = `<strong>Not a quadratic.</strong> With <span class="var">a</span> = 0 there is no x² term, so this is the line ${sol.forms.standard}.`;
    renderForms(sol);
    renderResults(sol);
    renderFactoring(sol);
    renderConversions(sol);
    timeline = buildTimeline(sol);
    timeline.finish();
    frame(sol, { refit });
    writeHash();
  }

  /** Coalesce slider input into one update per animation frame (a timer backs it up where frames are throttled). */
  let pending = null;
  function requestUpdate() {
    if (pending) return;
    const run = () => {
      if (!pending) return;
      cancelAnimationFrame(pending.frame);
      clearTimeout(pending.timer);
      pending = null;
      update();
    };
    pending = { frame: requestAnimationFrame(run), timer: setTimeout(run, 50) };
  }

  function writeHash() {
    const params = new URLSearchParams(location.hash.slice(1));
    for (const keys of Object.values(PARAMS)) keys.forEach((key) => params.delete(key));
    PARAMS[state.form].forEach((key, i) => params.set(key, values()[i]));
    history.replaceState(null, "", `#${params.toString()}`);
  }

  /** The form is read from which keys the hash carries: b, c / h, k / r1, r2. */
  function readHash() {
    const params = new URLSearchParams(location.hash.slice(1));
    const num = (key) => (params.has(key) && params.get(key) !== "" && Number.isFinite(Number(params.get(key))) ? Number(params.get(key)) : null);
    const form = ["factored", "vertex", "standard"].find((name) => PARAMS[name].slice(1).every((key) => num(key) !== null));
    if (!form) return false;
    const [a, p, q] = PARAMS[form].map(num);
    const changed = form !== state.form || [a ?? state.a, p, q].some((v, i) => v !== values()[i]);
    Object.assign(state, { form, a: a ?? state.a, p, q });
    return changed;
  }

  function play() {
    if (!timeline) return;
    el.run.hidden = true;
    timeline.play();
    setPlaying(true);
  }

  const KEYS = ["a", "p", "q"];
  SLOTS.forEach((slot, i) => {
    for (const suffix of ["range", "num"]) {
      $(`${slot}-${suffix}`).addEventListener("input", (event) => {
        state[KEYS[i]] = event.target.value === "" ? NaN : Number(event.target.value);
        $(`${slot}-${suffix === "range" ? "num" : "range"}`).value = event.target.value;
        const shown = $(`${slot}-value`);
        if (shown && Number.isFinite(state[KEYS[i]])) shown.textContent = fmt(state[KEYS[i]]);
        el.note.hidden = true;
        requestUpdate();
      });
    }
  });
  el.form.addEventListener("change", () => { switchForm(el.form.value); update(); });
  document.querySelectorAll("[data-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      const [form, nums] = button.dataset.preset.split(":");
      [state.a, state.p, state.q] = nums.split(",").map(Number);
      state.form = form;
      el.note.hidden = true;
      renderFormControls();
      syncInputs();
      update({ refit: true });
      play();
    });
  });
  document.querySelectorAll("[data-show]").forEach((box) => {
    box.addEventListener("change", () => { state.show[box.dataset.show] = box.checked; update(); });
  });
  el.play.addEventListener("click", () => {
    if (!timeline) return;
    if (timeline.playing) { timeline.stop(); setPlaying(false); return; }
    el.run.hidden = true;
    timeline.play({ from: timeline.time });
    setPlaying(true);
  });
  el.run.addEventListener("click", play);
  el.finish.addEventListener("click", () => { if (timeline) { timeline.finish(); setPlaying(false); } });
  el.scrub.addEventListener("input", () => { if (timeline) { timeline.seek(el.scrub.value / 1000); setPlaying(false); } });
  el.speed.addEventListener("change", () => { if (timeline) timeline.speed = Number(el.speed.value); });
  scene.onResize = () => { if (timeline) timeline.render(); };
  window.addEventListener("hashchange", () => { if (readHash()) { renderFormControls(); syncInputs(); update(); } });

  renderGlossary();
  const fromHash = readHash();
  renderFormControls();
  syncInputs();
  update({ fromConfig: !fromHash });
})();
