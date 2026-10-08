/*
 * parallel.js — page controller for parallel & perpendicular lines.
 *
 * Reads the Python-built config, wires the controls, and turns a solution into a Manim-style
 * Timeline: line 1 through its two points with its slope triangle (run, rise), the same for
 * line 2, then the verdict — equal slopes for parallel, a right-angle mark where perpendicular
 * lines cross, or the angle between them. The URL hash (#x1=0&y1=1&…) presets the points and is
 * watched, so links and PP.embed(...).set() update the page live.
 */
(function () {
  "use strict";
  const { ManimCanvas, Timeline, rate, view } = window.Manim;
  const { solve, fmt } = window.ParallelMath;

  const config = JSON.parse(document.getElementById("pp-config").textContent);
  const C = Object.fromEntries(Object.entries(config.roles).map(([el, role]) => [el, config.theme.stage[role]]));
  const KEYS = ["x1", "y1", "x2", "y2", "x3", "y3", "x4", "y4"];

  const $ = (id) => document.getElementById(id);
  const el = {
    play: $("play"), finish: $("finish"), scrub: $("scrub"), speed: $("speed"), narration: $("narration"),
    results: $("results"), steps: $("steps"), error: $("error"), run: $("run"), glossary: $("glossary"), verdict: $("verdict"),
  };
  const IDLE = "Press run to animate.";

  const state = { ...config.initial, show: {} };
  document.querySelectorAll("[data-show]").forEach((box) => { state.show[box.dataset.show] = box.checked; });

  const scene = new ManimCanvas($("scene"), { theme: config.theme, view: config.solution.window });
  let timeline = null;

  const paren = (n) => (n < 0 ? `(${fmt(n)})` : fmt(n));
  const point = (x, y) => `(${fmt(x)}, ${fmt(y)})`;
  const swatch = (color) => `<span class="swatch" style="background:${color}"></span>`;
  const slopeText = (l) => (l.m === null ? "undefined (vertical)" : fmt(l.m));

  const TERMS = {
    "Slope m": "Rise over run: how much y changes for each 1 unit x increases, m = (y₂ − y₁) / (x₂ − x₁).",
    "Parallel ∥": "Lines that never meet: their slopes are equal, m₁ = m₂. Two vertical lines are parallel too.",
    "Perpendicular ⟂": "Lines that meet at a right angle: their slopes multiply to −1, m₁ · m₂ = −1 (each is the negative reciprocal of the other).",
    "Vertical line": "x = constant. Its run is 0, so its slope is undefined; it is perpendicular to any horizontal line (m = 0).",
    "Angle between": "The smaller angle where the lines cross, from the difference of their angles of inclination, θ = arctan(m).",
  };
  function renderGlossary() {
    el.glossary.innerHTML = Object.entries(TERMS).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("");
  }

  const VERDICT = {
    parallel: "Parallel: the slopes are equal, so the lines never meet.",
    perpendicular: "Perpendicular: the lines meet at a right angle.",
    "same line": "The same line: equal slopes and the same intercept, so the points all lie on one line.",
    neither: "Neither parallel nor perpendicular.",
  };

  function renderResults(sol) {
    const { line1: l1, line2: l2 } = sol;
    const rows = [
      ["line", "Line 1", `${swatch(C.line1)}${l1.equation}`],
      ["slope", "Slope m₁", slopeText(l1)],
      ["line", "Line 2", `${swatch(C.line2)}${l2.equation}`],
      ["slope", "Slope m₂", slopeText(l2)],
      ["compare", "m₁ · m₂", sol.product === null ? "undefined (a vertical line)" : fmt(sol.product)],
      ["compare", "Angle between", `${fmt(sol.angle_between)}°`],
      ["verdict", "Crossing", sol.crossing ? `${swatch(C.meet)}${point(...sol.crossing)}` : "none: they never meet"],
    ];
    el.results.innerHTML = rows.map(([id, k, v]) => `<dt data-step="${id}">${k}</dt><dd data-step="${id}">${v}</dd>`).join("");
    el.verdict.textContent = VERDICT[sol.relation];
    el.verdict.dataset.relation = sol.relation;
  }

  /** "m₁ = (y₂ − y₁) / (x₂ − x₁) = …" for line 1 (points ₁, ₂) or line 2 (points ₃, ₄). */
  function slopeStep(l, [a, b], i, j, n) {
    if (l.m === null) return `x${i} = x${j} = ${fmt(a[0])}: the run is 0, so m${n} is undefined (a vertical line, ${l.equation})`;
    return `m${n} = (y${j} − y${i}) / (x${j} − x${i}) = (${fmt(b[1])} − ${paren(a[1])}) / (${fmt(b[0])} − ${paren(a[0])}) = ${fmt(l.m)}  →  ${l.equation}`;
  }

  function renderSteps(sol) {
    const [p1, p2, p3, p4] = sol.points;
    const { line1: l1, line2: l2 } = sol;
    const vertical = l1.m === null || l2.m === null;
    const items = [
      ["line", "Slope of line 1", slopeStep(l1, [p1, p2], "₁", "₂", "₁")],
      ["slope", "Slope of line 2", slopeStep(l2, [p3, p4], "₃", "₄", "₂")],
      ["compare", "Parallel? Compare the slopes", vertical
        ? (l1.m === null && l2.m === null ? "both vertical: parallel" : "one vertical, one not: not parallel")
        : `m₁ = ${fmt(l1.m)}, m₂ = ${fmt(l2.m)}: ${sol.parallel ? "equal, so parallel" : "not equal, so not parallel"}`],
      ["compare", "Perpendicular? Multiply the slopes", vertical
        ? (sol.perpendicular ? "vertical and horizontal: perpendicular (the exception to the product rule)" : "a vertical line is perpendicular only to a horizontal one (m = 0)")
        : `m₁ · m₂ = ${paren(l1.m)} · ${paren(l2.m)} = ${fmt(sol.product)}: ${sol.perpendicular ? "−1, so perpendicular" : "not −1, so not perpendicular"}`],
      ["verdict", "Verdict", VERDICT[sol.relation]],
    ];
    el.steps.innerHTML = items.map(([id, title, math]) =>
      `<li class="steps__item" data-step="${id}"><p class="steps__title">${title}</p><p class="steps__math">${math}</p></li>`).join("");
  }

  function highlight(step) {
    el.narration.textContent = step ? step.caption : IDLE;
    document.querySelectorAll("[data-step]").forEach((node) => node.classList.toggle("is-active", !!step && node.dataset.step === step.id));
  }

  // ---- Drawing ----------------------------------------------------------------
  /** The whole line across the view: y = mx + b, or x = constant for a vertical line. */
  function drawLine(l, p, color) {
    const v = scene.view;
    if (l.m === null) scene.line(l.vertical_x, v.y_min, l.vertical_x, v.y_max, p, color, { width: 4 });
    else scene.line(v.x_min, l.m * v.x_min + l.b, v.x_max, l.m * v.x_max + l.b, p, color, { width: 4 });
  }

  /** Run along x, then rise along y, from the line's first point to its second. */
  function triangle([a, b], p, show) {
    if (a[0] === b[0]) return;
    scene.line(a[0], a[1], b[0], a[1], Math.min(1, p * 2), C.run, { width: 2.5, dash: [7, 5] });
    const flat = b[1] === a[1];   // a horizontal line: no rise to draw
    if (p > 0.5 && !flat) scene.line(b[0], a[1], b[0], b[1], (p - 0.5) * 2, C.rise, { width: 2.5, dash: [7, 5] });
    if (show.labels && p >= 1) {
      scene.label(`run ${fmt(b[0] - a[0])}`, (a[0] + b[0]) / 2, a[1], 1, C.run, { dx: 0, dy: b[1] > a[1] ? 18 : -12, align: "center", size: 13 });
      if (!flat) scene.label(`rise ${fmt(b[1] - a[1])}`, b[0], (a[1] + b[1]) / 2, 1, C.rise, { dx: 8, align: "left", size: 13 });
    }
  }

  /** A small square at the crossing, turned to sit in the corner between the two lines. */
  function rightAngle([x, y], l1, l2, p) {
    const dir = (l) => (l.m === null ? [0, 1] : [1 / Math.hypot(1, l.m), l.m / Math.hypot(1, l.m)]);
    const [u, w] = [dir(l1), dir(l2)];
    const s = (scene.view.x_max - scene.view.x_min) * 0.035;
    const pts = [[x + u[0] * s, y + u[1] * s], [x + (u[0] + w[0]) * s, y + (u[1] + w[1]) * s], [x + w[0] * s, y + w[1] * s]];
    scene.line(pts[0][0], pts[0][1], pts[1][0], pts[1][1], p, C.meet, { width: 2.5 });
    scene.line(pts[1][0], pts[1][1], pts[2][0], pts[2][1], p, C.meet, { width: 2.5 });
  }

  function buildTimeline(sol) {
    const { line1: l1, line2: l2 } = sol;
    const [p1, p2, p3, p4] = sol.points;
    const show = state.show;
    const tl = new Timeline(scene, {
      onFrame: (t, total) => { el.scrub.value = total ? Math.round((t / total) * 1000) : 1000; },
      onStep: highlight,
      onDone: () => setPlaying(false),
    });
    tl.speed = Number(el.speed.value);

    if (show.grid) tl.add({ id: "line", caption: "Set up the axes", duration: 0.8, draw: (p) => scene.grid(p) });
    tl.add({ id: "line", caption: "Set up the axes", duration: 1.0, parallel: show.grid, draw: (p) => scene.axes(p) });
    const pair = (a, b, color, n, k) => (p) => {
      scene.dot(a[0], a[1], p, color); scene.dot(b[0], b[1], p, color);
      if (show.labels) { scene.label(`(x${n}, y${n})`, a[0], a[1], p, color, { dx: -10, dy: -14, align: "right", size: 13 }); scene.label(`(x${k}, y${k})`, b[0], b[1], p, color, { dx: 10, dy: -14, size: 13 }); }
    };
    tl.add({ id: "line", caption: `Line 1 through ${point(...p1)} and ${point(...p2)}`, duration: 0.7, draw: pair(p1, p2, C.line1, "₁", "₂") });
    if (show.triangles) tl.add({ id: "line", caption: l1.m === null ? "Line 1 is vertical: run 0, slope undefined" : `Run then rise: m₁ = ${fmt(l1.m)}`, duration: 1.0, draw: (p) => triangle([p1, p2], p, show) });
    tl.add({ id: "line", caption: `Line 1: ${l1.equation}`, duration: 1.1, draw: (p) => drawLine(l1, p, C.line1) });
    tl.add({ id: "slope", caption: `Line 2 through ${point(...p3)} and ${point(...p4)}`, duration: 0.7, draw: pair(p3, p4, C.line2, "₃", "₄") });
    if (show.triangles) tl.add({ id: "slope", caption: l2.m === null ? "Line 2 is vertical: run 0, slope undefined" : `Run then rise: m₂ = ${fmt(l2.m)}`, duration: 1.0, draw: (p) => triangle([p3, p4], p, show) });
    tl.add({ id: "slope", caption: `Line 2: ${l2.equation}`, duration: 1.1, draw: (p) => drawLine(l2, p, C.line2) });

    if (sol.relation === "perpendicular" && sol.crossing) {
      tl.add({ id: "compare", caption: l1.m === null || l2.m === null ? "Vertical meets horizontal" : `m₁ · m₂ = ${fmt(sol.product)}`, duration: 0.8, rate: rate.linear, draw: () => {} });
      tl.add({ id: "verdict", caption: `Perpendicular: a right angle at ${point(...sol.crossing)}`, duration: 0.9, draw: (p) => { scene.dot(sol.crossing[0], sol.crossing[1], p, C.meet, 5); rightAngle(sol.crossing, l1, l2, p); } });
    } else if (sol.crossing) {
      tl.add({ id: "compare", caption: `m₁ · m₂ = ${sol.product === null ? "undefined" : fmt(sol.product)}, not −1; m₁ ≠ m₂`, duration: 0.8, rate: rate.linear, draw: () => {} });
      tl.add({ id: "verdict", caption: `Neither: they cross at ${point(...sol.crossing)}, ${fmt(sol.angle_between)}° apart`, duration: 0.9, draw: (p) => scene.flash(sol.crossing[0], sol.crossing[1], p, C.meet) });
    } else {
      tl.add({ id: "compare", caption: sol.relation === "same line" ? "Same slope and same intercept" : `m₁ = m₂ = ${slopeText(l1)}`, duration: 0.9, rate: rate.linear, draw: () => {} });
      tl.add({ id: "verdict", caption: VERDICT[sol.relation], duration: 0.8, rate: rate.linear, draw: () => {} });
    }
    return tl;
  }

  // ---- Controls ----------------------------------------------------------------
  function setPlaying(playing) { el.play.textContent = playing ? "❚❚ Pause" : "▶ Play"; }
  function syncInputs() { for (const key of KEYS) $(key).value = state[key]; }

  function frame(sol, { refit = false } = {}) {
    const points = [...sol.points, ...(sol.crossing && sol.crossing.every((c) => Math.abs(c) <= 50) ? [sol.crossing] : [])];
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
      sol = fromConfig ? config.solution : solve(...KEYS.map((k) => state[k]));
    } catch (error) {
      el.error.textContent = error.message;
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
    $(key).addEventListener("input", (event) => {
      state[key] = event.target.value === "" ? NaN : Number(event.target.value);
      update();
    });
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
