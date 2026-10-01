/*
 * lines.js — page controller for equations of a line.
 *
 * Reads the Python-built config, wires the controls, and turns a solution into
 * a Manim-style Timeline: the point, a slope triangle (run 1, rise m), the line
 * and its intercepts. The form toggle shows the same line as y = mx + b,
 * y − y₁ = m(x − x₁) or Ax + By = C. The URL hash (#x1=1&y1=3&m=2) presets
 * values and is watched, so links and PP.embed(...).set() update the page live.
 */
(function () {
  "use strict";
  const { ManimCanvas, Timeline, rate, view } = window.Manim;
  const { solve, fmt } = window.LineMath;

  const config = JSON.parse(document.getElementById("pp-config").textContent);
  const C = Object.fromEntries(Object.entries(config.roles).map(([el, role]) => [el, config.theme.stage[role]]));
  const KEYS = ["x1", "y1", "m"];

  const $ = (id) => document.getElementById(id);
  const el = {
    play: $("play"), finish: $("finish"), scrub: $("scrub"), speed: $("speed"), narration: $("narration"),
    results: $("results"), steps: $("steps"), error: $("error"), run: $("run"), glossary: $("glossary"),
    table: $("table"), formEq: $("form-eq"), formAbout: $("form-about"), formTerms: $("form-terms"),
  };
  const IDLE = "Press run to animate.";

  const state = { ...config.initial, show: {}, form: document.querySelector('input[name="form"]:checked').value };
  document.querySelectorAll("[data-show]").forEach((box) => { state.show[box.dataset.show] = box.checked; });

  const scene = new ManimCanvas($("scene"), { theme: config.theme, view: config.solution.window });
  let timeline = null;
  let current = null;

  const paren = (n) => (n < 0 ? `(${fmt(n)})` : fmt(n));
  const point = (x, y) => `(${fmt(x)}, ${fmt(y)})`;
  const swatch = (color) => `<span class="swatch" style="background:${color}"></span>`;

  const TERMS = {
    "Slope m": "How much y changes for each 1 unit x increases. The same in all three forms.",
    "y-intercept b": "Where the line crosses the y-axis (x = 0): the b in y = mx + b.",
    "x-intercept": "Where the line crosses the x-axis (y = 0): x = −b / m.",
    "Point (x₁, y₁)": "Any point on the line; point-slope form is built from it.",
    "A, B, C": "Whole numbers in Ax + By = C. From y = mx + b: A = −m, B = 1, C = b, then scaled and signed so A ≥ 0.",
  };

  function renderGlossary() {
    el.glossary.innerHTML = Object.entries(TERMS).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("");
  }

  // ---- The three forms ------------------------------------------------------
  function formView(sol, form) {
    const { A, B, C: c } = sol.standard;
    if (form === "point_slope") {
      return {
        general: "y − y₁ = m(x − x₁)",
        about: "Built straight from one point and the slope; handy when you know a point but not the intercept.",
        equation: sol.point_slope_form,
        terms: [["m", fmt(sol.m), "the slope"], ["x₁", `${swatch(C.point)}${fmt(sol.x1)}`, "x of the known point"], ["y₁", `${swatch(C.point)}${fmt(sol.y1)}`, "y of the known point"]],
      };
    }
    if (form === "standard") {
      return {
        general: "Ax + By = C",
        about: "Whole-number coefficients with A ≥ 0; it also covers vertical lines (B = 0), which have no slope.",
        equation: sol.standard_form,
        terms: [["A", String(A), "coefficient of x (−m, scaled)"], ["B", String(B), "coefficient of y (1, scaled)"], ["C", String(c), "the constant (b, scaled)"]],
      };
    }
    return {
      general: "y = mx + b",
      about: "Shows the slope and the y-intercept at a glance.",
      equation: sol.slope_intercept_form,
      terms: [["m", fmt(sol.m), "the slope: rise over run"], ["b", `${swatch(C.y_intercept)}${fmt(sol.b)}`, "the y-intercept, where x = 0"]],
    };
  }

  function renderForm(sol) {
    const shown = formView(sol, state.form);
    el.formEq.textContent = shown.equation;
    el.formAbout.innerHTML = `<span class="form-general">${shown.general}</span> ${shown.about}`;
    el.formTerms.innerHTML = shown.terms.map(([sym, value, meaning]) =>
      `<dt><span class="var">${sym}</span> = ${value}</dt><dd>${meaning}</dd>`).join("");
  }

  const rows = (items) => items.map(([id, k, v]) =>
    `<dt data-step="${id}" title="${TERMS[k] || ""}">${k}</dt><dd data-step="${id}">${v}</dd>`).join("");

  function renderResults(sol) {
    const { A, B, C: c } = sol.standard;
    el.results.innerHTML = rows([
      ["point", "Point (x₁, y₁)", `${swatch(C.point)}${point(sol.x1, sol.y1)}`],
      ["slope", "Slope m", fmt(sol.m)],
      ["intercepts", "y-intercept b", `${swatch(C.y_intercept)}${point(0, sol.b)}`],
      ["intercepts", "x-intercept", sol.x_intercept === null ? (sol.b === 0 ? "every x (the line is the x-axis)" : "none (horizontal line)") : `${swatch(C.x_intercept)}${point(sol.x_intercept, 0)}`],
      ["standard", "A, B, C", `${A}, ${B}, ${c}`],
    ]);
  }

  function renderSteps(sol) {
    const { x1, y1, m, b } = sol;
    const { A, B, C: c } = sol.standard;
    const items = [
      ["point", "Start from a point and a slope", `(x₁, y₁) = ${point(x1, y1)},  m = ${fmt(m)}`],
      ["slope", "Point-slope form", `y − y₁ = m(x − x₁)  →  ${sol.point_slope_form}`],
      ["intercepts", "Solve for y: slope-intercept form", `b = y₁ − m·x₁ = ${paren(y1)} − ${paren(m)}·${paren(x1)} = ${fmt(b)}  →  ${sol.slope_intercept_form}`],
      ["standard", "Move x to the left: standard form", `−mx + y = b  →  scale to whole numbers with A ≥ 0  →  ${sol.standard_form}   (A = ${A}, B = ${B}, C = ${c})`],
      ["line", "Check: all three give the same y", "See the table below: every row matches."],
    ];
    el.steps.innerHTML = items.map(([id, title, math]) =>
      `<li class="steps__item" data-step="${id}"><p class="steps__title">${title}</p><p class="steps__math">${math}</p></li>`).join("");
  }

  function renderTable(sol) {
    el.table.innerHTML = sol.table.map((r) =>
      `<tr><td>${fmt(r.x)}</td><td>${fmt(r.slope_intercept)}</td><td>${fmt(r.point_slope)}</td><td>${fmt(r.standard)}</td></tr>`).join("");
  }

  function highlight(step) {
    el.narration.textContent = step ? step.caption : IDLE;
    document.querySelectorAll("[data-step]").forEach((node) => {
      node.classList.toggle("is-active", !!step && node.dataset.step === step.id);
    });
  }

  // ---- Timeline -------------------------------------------------------------
  function buildTimeline(sol) {
    const { x1, y1, m, b } = sol;
    const show = state.show;
    const tl = new Timeline(scene, {
      onFrame: (t, total) => { el.scrub.value = total ? Math.round((t / total) * 1000) : 1000; },
      onStep: highlight,
      onDone: () => setPlaying(false),
    });
    tl.speed = Number(el.speed.value);

    if (show.grid) tl.add({ id: "point", caption: "Set up the axes", duration: 0.8, draw: (p) => scene.grid(p) });
    tl.add({ id: "point", caption: "Set up the axes", duration: 1.0, parallel: show.grid, draw: (p) => scene.axes(p) });
    tl.add({
      id: "point", caption: `The point ${point(x1, y1)}`, duration: 0.6,
      draw: (p) => {
        scene.dot(x1, y1, p, C.point);
        if (show.labels) scene.label(`(x₁, y₁) = ${point(x1, y1)}`, x1, y1, p, C.point, { dx: -10, dy: -16, align: "right" });
      },
    });
    if (show.triangle && m !== 0) {
      tl.add({
        id: "slope", caption: "Run 1 to the right…", duration: 0.8,
        draw: (p) => {
          scene.line(x1, y1, x1 + 1, y1, p, C.run, { width: 3, dash: [8, 6] });
          if (show.labels) scene.label("run 1", x1 + 0.5, y1, p, C.run, { dy: m > 0 ? 18 : -14, dx: 0, align: "center" });
        },
      });
      tl.add({
        id: "slope", caption: `…and rise m = ${fmt(m)}`, duration: 0.8,
        draw: (p) => {
          scene.line(x1 + 1, y1, x1 + 1, y1 + m, p, C.rise, { width: 3, dash: [8, 6] });
          if (show.labels) scene.label(`rise ${fmt(m)}`, x1 + 1, y1 + m / 2, p, C.rise, { dx: 10, align: "left" });
        },
      });
    }
    tl.add({ id: "line", caption: `The line ${sol.slope_intercept_form}`, duration: 1.6, draw: (p) => scene.curve((x) => m * x + b, p, C.line) });
    if (show.intercepts) {
      tl.add({
        id: "intercepts", caption: `y-intercept: b = ${fmt(b)}`, duration: 0.7,
        draw: (p) => {
          scene.dot(0, b, p, C.y_intercept);
          if (show.labels) scene.label(`b = ${fmt(b)}`, 0, b, p, C.y_intercept, { dx: 10, dy: 18, align: "left" });
        },
      });
      tl.add({ id: "intercepts", duration: 0.6, parallel: true, rate: rate.linear, draw: (p) => scene.flash(0, b, p, C.y_intercept) });
      if (sol.x_intercept !== null && sol.x_intercept !== 0) {
        const xi = sol.x_intercept;
        tl.add({
          id: "intercepts", caption: `x-intercept: x = −b / m = ${fmt(xi)}`, duration: 0.7,
          draw: (p) => {
            scene.dot(xi, 0, p, C.x_intercept);
            if (show.labels) scene.label(`x = ${fmt(xi)}`, xi, 0, p, C.x_intercept, { dy: 20, dx: 0, align: "center" });
          },
        });
      }
    }
    tl.add({ id: "standard", caption: `Standard form: ${sol.standard_form}`, duration: 1.0, rate: rate.linear, draw: () => {} });
    return tl;
  }

  // ---- Controls -------------------------------------------------------------
  function setPlaying(playing) { el.play.textContent = playing ? "❚❚ Pause" : "▶ Play"; }

  function syncInputs() {
    for (const key of KEYS) {
      $(`${key}-range`).value = state[key];
      $(`${key}-num`).value = state[key];
    }
  }

  function frame(sol, { refit = false } = {}) {
    const points = [[sol.x1, sol.y1]];
    if (Math.abs(sol.b) <= 50) points.push([0, sol.b]);
    const target = refit ? view.roomy(sol.window) : view.follow(scene.targetView, sol.window, points);
    if (!target) return;
    scene.moveTo(target, { onFrame: () => { if (timeline && !timeline.playing) timeline.render(); } });
  }

  function update({ fromConfig = false, refit = false } = {}) {
    if (timeline) timeline.stop();
    setPlaying(false);
    if (KEYS.some((k) => !Number.isFinite(state[k]))) {
      el.error.textContent = "Enter a number for the point and the slope.";
      el.error.hidden = false;
      return;
    }
    el.error.hidden = true;
    const sol = fromConfig ? config.solution : solve(state.x1, state.y1, state.m);
    current = sol;
    renderResults(sol);
    renderForm(sol);
    renderSteps(sol);
    renderTable(sol);
    timeline = buildTimeline(sol);
    timeline.finish();
    frame(sol, { refit });
    PPParams.write(Object.fromEntries(KEYS.map((k) => [k, state[k]])));
  }

  function readHash() {
    const values = PPParams.read(KEYS);
    Object.assign(state, values);
    return Object.keys(values).length > 0;
  }

  function play() {
    if (!timeline) return;
    el.run.hidden = true;
    timeline.play();
    setPlaying(true);
  }

  for (const key of KEYS) {
    for (const suffix of ["range", "num"]) {
      $(`${key}-${suffix}`).addEventListener("input", (event) => {
        state[key] = event.target.value === "" ? NaN : Number(event.target.value);
        $(`${key}-${suffix === "range" ? "num" : "range"}`).value = event.target.value;
        update();
      });
    }
  }
  document.querySelectorAll("[data-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      button.dataset.preset.split(",").map(Number).forEach((v, i) => { state[KEYS[i]] = v; });
      syncInputs();
      update({ refit: true });
      play();
    });
  });
  document.querySelectorAll("[data-show]").forEach((box) => {
    box.addEventListener("change", () => { state.show[box.dataset.show] = box.checked; update(); });
  });
  document.querySelectorAll('input[name="form"]').forEach((radio) => {
    radio.addEventListener("change", () => { state.form = radio.value; if (current) renderForm(current); });
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
  window.addEventListener("hashchange", () => { if (readHash()) { syncInputs(); update(); } });

  renderGlossary();
  const fromHash = readHash();
  syncInputs();
  update({ fromConfig: !fromHash });
})();
