/*
 * slope.js — page controller for slope.
 *
 * Reads the Python-built config, wires the controls, and turns a solution into
 * a Manim-style Timeline: the two points, the run, the rise, then the line.
 * The URL hash (#x1=1&y1=1&x2=4&y2=3) presets values and is watched, so links
 * and PP.embed(...).set() update the page live.
 */
(function () {
  "use strict";
  const { ManimCanvas, Timeline, rate, view } = window.Manim;
  const { solve, fmt } = window.SlopeMath;

  const config = JSON.parse(document.getElementById("pp-config").textContent);
  const C = Object.fromEntries(Object.entries(config.roles).map(([el, role]) => [el, config.theme.stage[role]]));
  const KEYS = ["x1", "y1", "x2", "y2"];

  const $ = (id) => document.getElementById(id);
  const el = {
    play: $("play"), finish: $("finish"), scrub: $("scrub"), speed: $("speed"),
    narration: $("narration"), results: $("results"), steps: $("steps"), error: $("error"), run: $("run"), glossary: $("glossary"),
  };
  const IDLE = "Press run to animate.";

  const state = { ...config.initial, show: {} };
  document.querySelectorAll("[data-show]").forEach((box) => { state.show[box.dataset.show] = box.checked; });

  const scene = new ManimCanvas($("scene"), { theme: config.theme, view: config.solution.window });
  let timeline = null;

  const paren = (n) => (n < 0 ? `(${fmt(n)})` : fmt(n));
  const point = (x, y) => `(${fmt(x)}, ${fmt(y)})`;
  const swatch = (color) => `<span class="swatch" style="background:${color}"></span>`;

  const TERMS = {
    "Slope m": "How much y changes for each 1 unit x increases: rise ÷ run. The same between any two points on a straight line.",
    "Rise Δy": "The vertical change y₂ − y₁. Positive goes up, negative goes down.",
    "Run Δx": "The horizontal change x₂ − x₁. When it is 0 the line is vertical and the slope is undefined (you can't divide by zero).",
    "Kind": "Positive slopes rise left to right, negative slopes fall, zero is horizontal, undefined is vertical.",
    "Angle": "The angle the line makes with the positive x-axis: tan(angle) = m.",
    "y-intercept b": "Where the line crosses the y-axis (x = 0); the b in y = mx + b.",
    "x-intercept": "Where the line crosses the x-axis (y = 0).",
    "Slope-intercept": "y = mx + b: the slope and the y-intercept at a glance.",
    "Point-slope": "y − y₁ = m(x − x₁): built straight from one point and the slope.",
    "Standard": "Ax + By = C with whole numbers where possible.",
  };
  const KIND = {
    positive: "positive: rises left to right",
    negative: "negative: falls left to right",
    zero: "zero: horizontal line",
    undefined: "undefined: vertical line",
  };

  function renderGlossary() {
    el.glossary.innerHTML = Object.entries(TERMS).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("");
  }

  const rows = (items) => items.map(([id, k, v]) =>
    `<dt data-step="${id}" title="${TERMS[k] || ""}">${k}</dt><dd data-step="${id}">${v}</dd>`).join("");

  function renderResults(sol) {
    el.results.innerHTML = rows([
      ["slope", "Slope m", sol.slope === null ? "undefined (Δx = 0)" : fmt(sol.slope)],
      ["rise", "Rise Δy", `${swatch(C.rise)}${fmt(sol.rise)}`],
      ["run", "Run Δx", `${swatch(C.run)}${fmt(sol.run)}`],
      ["slope", "Kind", KIND[sol.kind]],
      ["slope", "Angle", `${fmt(sol.angle)}°`],
      ["yint", "y-intercept b", sol.y_intercept === null ? "none (vertical line)" : `${swatch(C.y_intercept)}${point(0, sol.y_intercept)}`],
      ["line", "x-intercept", sol.x_intercept === null ? (sol.y1 === 0 ? "every x (the line is the x-axis)" : "none (never crosses)") : point(sol.x_intercept, 0)],
      ["line", "Slope-intercept", sol.slope_intercept_form],
      ["line", "Point-slope", sol.point_slope_form],
      ["line", "Standard", sol.standard_form],
    ]);
  }

  function renderSteps(sol) {
    const { x1, y1, x2, y2 } = sol;
    const m = sol.slope;
    const items = [
      ["points", "Pick two points", `(x₁, y₁) = ${point(x1, y1)},  (x₂, y₂) = ${point(x2, y2)}`],
      ["run", "Run: how far across", `Δx = x₂ − x₁ = ${paren(x2)} − ${paren(x1)} = ${fmt(sol.run)}`],
      ["rise", "Rise: how far up", `Δy = y₂ − y₁ = ${paren(y2)} − ${paren(y1)} = ${fmt(sol.rise)}`],
      ["slope", "Slope = rise ÷ run",
        m === null ? `m = ${fmt(sol.rise)} / 0 is undefined: the line is vertical` : `m = Δy / Δx = ${fmt(sol.rise)} / ${paren(sol.run)} = ${fmt(m)}`],
      ["yint", "y-intercept", m === null ? "A vertical line never crosses the y-axis (unless it is the y-axis)"
        : `b = y₁ − m·x₁ = ${paren(y1)} − ${paren(m)}·${paren(x1)} = ${fmt(sol.y_intercept)}`],
      ["line", "Equation of the line", `${sol.slope_intercept_form}   (point-slope: ${sol.point_slope_form})`],
    ];
    el.steps.innerHTML = items.map(([id, title, math]) =>
      `<li class="steps__item" data-step="${id}"><p class="steps__title">${title}</p><p class="steps__math">${math}</p></li>`).join("");
  }

  function highlight(step) {
    el.narration.textContent = step ? step.caption : IDLE;
    document.querySelectorAll("[data-step]").forEach((node) => {
      node.classList.toggle("is-active", !!step && node.dataset.step === step.id);
    });
  }

  // ---- Timeline -------------------------------------------------------------
  function buildTimeline(sol) {
    const { x1, y1, x2, y2 } = sol;
    const show = state.show;
    const m = sol.slope;
    const tl = new Timeline(scene, {
      onFrame: (t, total) => { el.scrub.value = total ? Math.round((t / total) * 1000) : 1000; },
      onStep: highlight,
      onDone: () => setPlaying(false),
    });
    tl.speed = Number(el.speed.value);

    if (show.grid) tl.add({ id: "points", caption: "Set up the axes", duration: 0.8, draw: (p) => scene.grid(p) });
    tl.add({ id: "points", caption: "Set up the axes", duration: 1.0, parallel: show.grid, draw: (p) => scene.axes(p) });
    // A point to the left labels on its left, so the two labels never overlap.
    const side = (x, other) => (x <= other ? { dx: -10, align: "right" } : { dx: 10, align: "left" });
    [[x1, y1, x2, "₁"], [x2, y2, x1, "₂"]].forEach(([x, y, other, sub]) => {
      tl.add({
        id: "points", caption: `Point ${sub === "₁" ? 1 : 2}: ${point(x, y)}`, duration: 0.6,
        draw: (p) => {
          scene.dot(x, y, p, C.points);
          if (show.labels) scene.label(`P${sub} ${point(x, y)}`, x, y, p, C.points, { dy: -16, ...side(x, other) });
        },
      });
    });

    if (show.triangle) {
      tl.add({
        id: "run", caption: `Run: Δx = ${fmt(sol.run)}`, duration: 1.0,
        draw: (p) => {
          scene.line(x1, y1, x2, y1, p, C.run, { width: 3, dash: [8, 6] });
          if (show.labels && sol.run !== 0) scene.label(`run = ${fmt(sol.run)}`, (x1 + x2) / 2, y1, p, C.run, { dy: y2 >= y1 ? 22 : -14, dx: 0, align: "center" });
        },
      });
      tl.add({
        id: "rise", caption: `Rise: Δy = ${fmt(sol.rise)}`, duration: 1.0,
        draw: (p) => {
          scene.line(x2, y1, x2, y2, p, C.rise, { width: 3, dash: [8, 6] });
          if (show.labels && sol.rise !== 0) scene.label(`rise = ${fmt(sol.rise)}`, x2, (y1 + y2) / 2, p, C.rise, x2 >= x1 ? { dx: 10, align: "left" } : { dx: -10, align: "right" });
        },
      });
    }
    tl.add({
      id: "slope", caption: m === null ? "Run is 0, so rise ÷ run is undefined: a vertical line" : `m = rise ÷ run = ${fmt(sol.rise)} ÷ ${fmt(sol.run)} = ${fmt(m)}`,
      duration: 1.2, rate: rate.linear, draw: () => {},
    });
    tl.add({
      id: "line", caption: `The line ${sol.slope_intercept_form}`, duration: 1.6,
      draw: (p) => {
        if (m === null) {
          const v = scene.view;
          scene.line(x1, v.y_min, x1, v.y_max, p, C.line, { width: 4 });
        } else {
          scene.curve((x) => m * x + sol.y_intercept, p, C.line);
        }
      },
    });
    if (show.yint && sol.y_intercept !== null) {
      const b = sol.y_intercept;
      tl.add({
        id: "yint", caption: `y-intercept: b = ${fmt(b)}`, duration: 0.7,
        draw: (p) => {
          scene.dot(0, b, p, C.y_intercept);
          if (show.labels) scene.label(`b = ${fmt(b)}`, 0, b, p, C.y_intercept, { dx: -10, dy: 18, align: "right" });
        },
      });
      tl.add({ id: "yint", duration: 0.6, parallel: true, rate: rate.linear, draw: (p) => scene.flash(0, b, p, C.y_intercept) });
    }
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

  /** Points the camera should keep in view: both points, plus nearby intercepts. */
  function frame(sol, { refit = false } = {}) {
    const points = [[sol.x1, sol.y1], [sol.x2, sol.y2]];
    if (sol.y_intercept !== null && Math.abs(sol.y_intercept) <= 50) points.push([0, sol.y_intercept]);
    const target = refit ? view.roomy(sol.window) : view.follow(scene.targetView, sol.window, points);
    if (!target) return;
    scene.moveTo(target, { onFrame: () => { if (timeline && !timeline.playing) timeline.render(); } });
  }

  function update({ fromConfig = false, refit = false } = {}) {
    if (timeline) timeline.stop();
    setPlaying(false);
    let sol;
    try {
      if (KEYS.some((k) => !Number.isFinite(state[k]))) throw new Error("Enter a number for every coordinate.");
      sol = fromConfig ? config.solution : solve(state.x1, state.y1, state.x2, state.y2);
    } catch (err) {
      el.error.textContent = err.message;
      el.error.hidden = false;
      return;
    }
    el.error.hidden = true;
    renderResults(sol);
    renderSteps(sol);
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
