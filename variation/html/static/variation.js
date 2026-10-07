/*
 * variation.js — page controller for direct & inverse variation.
 *
 * Reads the Python-built config, wires the controls, and turns a solution into
 * a Manim-style Timeline: the line y = kx or the hyperbola y = k / x, the known
 * point that fixes k, the triangle (y / x = k) or rectangle (xy = k) it makes
 * with the axes, and the predicted point with the same triangle or rectangle.
 * The URL hash (#x1=2&y1=6&x2=4&kind=inverse) presets values and is watched,
 * so links and PP.embed(...).set() update the page live.
 */
(function () {
  "use strict";
  const { ManimCanvas, Timeline, rate, view } = window.Manim;
  const { solve, fmt } = window.VariationMath;

  const config = JSON.parse(document.getElementById("pp-config").textContent);
  const C = Object.fromEntries(Object.entries(config.roles).map(([el, role]) => [el, config.theme.stage[role]]));
  const KEYS = ["x1", "y1", "x2"];

  const $ = (id) => document.getElementById(id);
  const el = {
    play: $("play"), finish: $("finish"), scrub: $("scrub"), speed: $("speed"), narration: $("narration"),
    results: $("results"), steps: $("steps"), error: $("error"), run: $("run"), glossary: $("glossary"),
    table: $("table"), tableInvariant: $("table-invariant"), tableNote: $("table-note"), kindAbout: $("kind-about"),
  };
  const IDLE = "Press run to animate.";

  const state = { ...config.initial, show: {} };
  document.querySelectorAll("[data-show]").forEach((box) => { state.show[box.dataset.show] = box.checked; });

  const scene = new ManimCanvas($("scene"), { theme: config.theme, view: config.solution.window });
  let timeline = null;

  const paren = (n) => (n < 0 ? `(${fmt(n)})` : fmt(n));
  const point = (x, y) => `(${fmt(x)}, ${fmt(y)})`;
  const swatch = (color) => `<span class="swatch" style="background:${color}"></span>`;
  const direct = (sol) => sol.kind === "direct";

  const TERMS = {
    "Constant of variation k": "The fixed number linking x and y: y = kx (direct) or y = k / x (inverse), with k ≠ 0.",
    "Direct variation": "y = kx: y / x = k for every point, so scaling x by c scales y by c. The graph is a line through the origin.",
    "Inverse variation": "y = k / x: xy = k for every point, so scaling x by c divides y by c. The graph is a hyperbola that never touches either axis.",
    "Known point (x₁, y₁)": "One pair of values you are given; it fixes k.",
    "New point (x₂, y₂)": "The y that the same k predicts at another x.",
    "Scale factor": "x₂ / x₁: how many times larger the new x is. Direct: y scales by the same factor. Inverse: by its reciprocal.",
  };

  function renderGlossary() {
    el.glossary.innerHTML = Object.entries(TERMS).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("");
  }

  const rows = (items) => items.map(([id, k, v]) =>
    `<dt data-step="${id}" title="${TERMS[k] || ""}">${k}</dt><dd data-step="${id}">${v}</dd>`).join("");

  function renderKind(sol) {
    el.kindAbout.innerHTML = direct(sol)
      ? '<span class="form-general">y = kx</span> y / x stays equal to k: double x and y doubles.'
      : '<span class="form-general">y = k / x</span> xy stays equal to k: double x and y halves.';
  }

  function renderResults(sol) {
    el.results.innerHTML = rows([
      ["point", "Known point (x₁, y₁)", `${swatch(C.known)}${point(sol.x1, sol.y1)}`],
      ["k", "Constant of variation k", fmt(sol.k)],
      ["equation", direct(sol) ? "Direct variation" : "Inverse variation", sol.equation],
      ["predict", "New point (x₂, y₂)", `${swatch(C.new)}${point(sol.x2, sol.y2)}`],
      ["scale", "Scale factor", `x ×${fmt(sol.x_scale)}  →  y ×${fmt(sol.y_scale)}`],
    ]);
  }

  function renderSteps(sol) {
    const { x1, y1, x2, y2, k } = sol;
    const items = direct(sol) ? [
      ["point", "Start from the known point", `(x₁, y₁) = ${point(x1, y1)}`],
      ["k", "Find k: divide y by x", `y = kx  ⇒  k = y₁ / x₁ = ${fmt(y1)} / ${paren(x1)} = ${fmt(k)}`],
      ["equation", "Write the variation", sol.equation],
      ["predict", "Predict y at the new x", `y₂ = k·x₂ = ${paren(k)}·${paren(x2)} = ${fmt(y2)}`],
      ["scale", "Scale x, scale y the same", `x₂ / x₁ = ${fmt(sol.x_scale)}, and y₂ / y₁ = ${fmt(y2)} / ${paren(y1)} = ${fmt(sol.y_scale)}: the same factor`],
      ["check", "Check: y / x is still k", x2 === 0 ? "x₂ = 0 gives y₂ = 0: the line passes through the origin" : `y₂ / x₂ = ${fmt(y2)} / ${paren(x2)} = ${fmt(y2 / x2)} = k`],
    ] : [
      ["point", "Start from the known point", `(x₁, y₁) = ${point(x1, y1)}`],
      ["k", "Find k: multiply x by y", `y = k / x  ⇒  k = x₁·y₁ = ${paren(x1)}·${paren(y1)} = ${fmt(k)}`],
      ["equation", "Write the variation", sol.equation],
      ["predict", "Predict y at the new x", `y₂ = k / x₂ = ${fmt(k)} / ${paren(x2)} = ${fmt(y2)}`],
      ["scale", "Scale x, scale y by the reciprocal", `x₂ / x₁ = ${fmt(sol.x_scale)}, and y₂ / y₁ = ${fmt(y2)} / ${paren(y1)} = ${fmt(sol.y_scale)} = 1 / ${fmt(sol.x_scale)}`],
      ["check", "Check: xy is still k", `x₂·y₂ = ${paren(x2)}·${paren(y2)} = ${fmt(x2 * y2)} = k`],
    ];
    el.steps.innerHTML = items.map(([id, title, math]) =>
      `<li class="steps__item" data-step="${id}"><p class="steps__title">${title}</p><p class="steps__math">${math}</p></li>`).join("");
  }

  function renderTable(sol) {
    el.tableInvariant.innerHTML = direct(sol) ? '<span class="var">y</span> / <span class="var">x</span>' : '<span class="var">x</span> · <span class="var">y</span>';
    el.table.innerHTML = sol.table.map((r) => `<tr><td>${fmt(r.x)}</td><td>${fmt(r.y)}</td><td>${fmt(r.invariant)}</td></tr>`).join("");
    el.tableNote.textContent = direct(sol)
      ? `The ratio y / x is ${fmt(sol.k)} on every row: that is what "y varies directly with x" means.`
      : `The product xy is ${fmt(sol.k)} on every row: that is what "y varies inversely with x" means.`;
  }

  function highlight(step) {
    el.narration.textContent = step ? step.caption : IDLE;
    document.querySelectorAll("[data-step]").forEach((node) => {
      node.classList.toggle("is-active", !!step && node.dataset.step === step.id);
    });
  }

  // ---- Drawing --------------------------------------------------------------
  /** y = k / x, drawn as its two branches so the stroke never jumps across the asymptote x = 0. */
  function hyperbola(k, p, color) {
    const v = scene.view;
    const { ctx } = scene;
    const span = v.y_max - v.y_min;
    const gap = (v.x_max - v.x_min) / 2000;
    const branches = [[v.x_min, -gap], [gap, v.x_max]].filter(([a, b]) => a < b);
    const samples = 300;
    const total = Math.max(2, Math.ceil(branches.length * samples * p));
    let drawn = 0;
    scene.withClip(() => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const [a, b] of branches) {
        if (drawn >= total) break;
        ctx.beginPath();
        for (let i = 0; i < samples && drawn < total; i++, drawn++) {
          const x = a + (b - a) * (i / (samples - 1));
          const y = Math.max(v.y_min - span, Math.min(v.y_max + span, k / x));
          i === 0 ? ctx.moveTo(scene.px(x), scene.py(y)) : ctx.lineTo(scene.px(x), scene.py(y));
        }
        ctx.stroke();
      }
    });
  }

  /** The rectangle from the origin to (x, y): its area |xy| is |k| for every point on y = k / x. */
  function rectangle(x, y, p, color) {
    scene.withClip(() => {
      const { ctx } = scene;
      ctx.globalAlpha = 0.18 * p;
      ctx.fillStyle = color;
      ctx.fillRect(Math.min(scene.px(0), scene.px(x)), Math.min(scene.py(0), scene.py(y)), Math.abs(scene.px(x) - scene.px(0)), Math.abs(scene.py(y) - scene.py(0)));
    });
    scene.line(0, y, x, y, p, color, { width: 2, dash: [6, 5] });
    scene.line(x, 0, x, y, p, color, { width: 2, dash: [6, 5] });
  }

  /** The triangle origin → (x, 0) → (x, y): its rise over run, y / x, is k for every point on y = kx. */
  function triangle(x, y, p, color) {
    scene.line(0, 0, x, 0, p, color, { width: 3, dash: [8, 6] });
    scene.line(x, 0, x, y, p, color, { width: 3, dash: [8, 6] });
  }

  function buildTimeline(sol) {
    const { x1, y1, x2, y2, k } = sol;
    const show = state.show;
    const isDirect = direct(sol);
    const tl = new Timeline(scene, {
      onFrame: (t, total) => { el.scrub.value = total ? Math.round((t / total) * 1000) : 1000; },
      onStep: highlight,
      onDone: () => setPlaying(false),
    });
    tl.speed = Number(el.speed.value);
    const shape = (x, y, p) => (isDirect ? triangle : rectangle)(x, y, p, C.invariant);
    const shapeLabel = (x, y) => (isDirect ? `y / x = ${fmt(y)} / ${paren(x)} = ${fmt(k)}` : `xy = ${paren(x)}·${paren(y)} = ${fmt(k)}`);

    if (show.grid) tl.add({ id: "point", caption: "Set up the axes", duration: 0.8, draw: (p) => scene.grid(p) });
    tl.add({ id: "point", caption: "Set up the axes", duration: 1.0, parallel: show.grid, draw: (p) => scene.axes(p) });
    tl.add({
      id: "point", caption: `The known point ${point(x1, y1)}`, duration: 0.6,
      draw: (p) => {
        scene.dot(x1, y1, p, C.known);
        if (show.labels) scene.label(`(x₁, y₁) = ${point(x1, y1)}`, x1, y1, p, C.known, { dx: 10, dy: -16 });
      },
    });
    if (show.invariant) {
      tl.add({
        id: "k", caption: isDirect ? `Rise over run from the origin: k = y₁ / x₁ = ${fmt(k)}` : `The rectangle's area: k = x₁·y₁ = ${fmt(k)}`, duration: 1.0,
        draw: (p) => {
          shape(x1, y1, p);
          if (show.labels) scene.label(shapeLabel(x1, y1), x1, y1 / 2, p, C.invariant, { dx: 10, dy: 0 });
        },
      });
    } else {
      tl.add({ id: "k", caption: isDirect ? `k = y₁ / x₁ = ${fmt(k)}` : `k = x₁·y₁ = ${fmt(k)}`, duration: 0.6, rate: rate.linear, draw: () => {} });
    }
    tl.add({
      id: "equation", caption: isDirect ? `The line ${sol.equation} through the origin` : `The hyperbola ${sol.equation}: it never touches either axis`, duration: 1.6,
      draw: (p) => (isDirect ? scene.curve((x) => k * x, p, C.curve) : hyperbola(k, p, C.curve)),
    });
    tl.add({
      id: "predict", caption: `At x₂ = ${fmt(x2)}: y₂ = ${isDirect ? `${fmt(k)}·${paren(x2)}` : `${fmt(k)} / ${paren(x2)}`} = ${fmt(y2)}`, duration: 0.7,
      draw: (p) => {
        scene.line(x2, 0, x2, y2, p, C.guide, { width: 1.5, dash: [4, 5] });
        scene.dot(x2, y2, p, C.new);
        if (show.labels) scene.label(`(x₂, y₂) = ${point(x2, y2)}`, x2, y2, p, C.new, { dx: 10, dy: y2 >= 0 ? -16 : 22 });
      },
    });
    tl.add({ id: "predict", duration: 0.6, parallel: true, rate: rate.linear, draw: (p) => scene.flash(x2, y2, p, C.new) });
    tl.add({ id: "scale", caption: `x ×${fmt(sol.x_scale)}, so y ×${fmt(sol.y_scale)}${isDirect ? "" : ` = 1 / ${fmt(sol.x_scale)}`}`, duration: 0.8, rate: rate.linear, draw: () => {} });
    if (show.invariant && x2 !== 0) {
      tl.add({
        id: "check", caption: isDirect ? `Same ratio: y₂ / x₂ = ${fmt(k)}` : `Same area: x₂·y₂ = ${fmt(k)}`, duration: 1.0,
        draw: (p) => {
          shape(x2, y2, p);
          if (show.labels) scene.label(shapeLabel(x2, y2), x2, y2 / 2, p, C.invariant, { dx: 10, dy: 0 });
        },
      });
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
    document.querySelectorAll('input[name="kind"]').forEach((radio) => { radio.checked = radio.value === state.kind; });
  }

  function frame(sol, { refit = false } = {}) {
    const points = [[0, 0], [sol.x1, sol.y1], [sol.x2, sol.y2]];
    const target = refit ? view.roomy(sol.window) : view.follow(scene.targetView, sol.window, points);
    if (!target) return;
    scene.moveTo(target, { onFrame: () => { if (timeline && !timeline.playing) timeline.render(); } });
  }

  function update({ fromConfig = false, refit = false } = {}) {
    if (timeline) timeline.stop();
    setPlaying(false);
    let sol;
    try {
      if (KEYS.some((k) => !Number.isFinite(state[k]))) throw new Error("Enter a number for x₁, y₁ and x₂.");
      sol = fromConfig ? config.solution : solve(state.x1, state.y1, state.x2, state.kind);
    } catch (error) {
      el.error.textContent = error.message;
      el.error.hidden = false;
      return;
    }
    el.error.hidden = true;
    renderKind(sol);
    renderResults(sol);
    renderSteps(sol);
    renderTable(sol);
    timeline = buildTimeline(sol);
    timeline.finish();
    frame(sol, { refit });
    PPParams.write({ ...Object.fromEntries(KEYS.map((k) => [k, state[k]])), kind: state.kind });
  }

  function readHash() {
    const values = PPParams.read(KEYS);
    const kind = new URLSearchParams(location.hash.slice(1)).get("kind");
    Object.assign(state, values);
    const known = window.VariationMath.KINDS.includes(kind);
    if (known) state.kind = kind;
    return Object.keys(values).length > 0 || known;
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
      const parts = button.dataset.preset.split(",");
      parts.slice(0, 3).map(Number).forEach((v, i) => { state[KEYS[i]] = v; });
      state.kind = parts[3];
      syncInputs();
      update({ refit: true });
      play();
    });
  });
  document.querySelectorAll("[data-show]").forEach((box) => {
    box.addEventListener("change", () => { state.show[box.dataset.show] = box.checked; update(); });
  });
  document.querySelectorAll('input[name="kind"]').forEach((radio) => {
    radio.addEventListener("change", () => { state.kind = radio.value; update({ refit: true }); });
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
