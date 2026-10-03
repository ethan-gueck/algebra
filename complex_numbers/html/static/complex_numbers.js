/*
 * complex_numbers.js — page controller for z = a + bi on the complex plane.
 *
 * Reads the Python-built config, wires the a and b sliders, and turns a
 * solution into a Manim-style Timeline on the complex plane (real part across,
 * imaginary part up): i turns a quarter turn so i² lands on −1, z is walked out
 * as a along and b up, z̄ is its mirror image across the real axis, and |z| is
 * its distance from 0, traced as a circle that passes through both. The plane
 * keeps equal units on both axes so the circle stays round. The URL hash
 * (#a=3&b=4) presets z and is watched, so links and PP.embed(...).set() update
 * the page live.
 */
(function () {
  "use strict";
  const { ManimCanvas, Timeline, rate, view, niceStep } = window.Manim;
  const { solve, fmt } = window.ComplexMath;

  const config = JSON.parse(document.getElementById("pp-config").textContent);
  const C = Object.fromEntries(Object.entries(config.roles).map(([el, role]) => [el, config.theme.stage[role]]));

  const $ = (id) => document.getElementById(id);
  const el = {
    play: $("play"), finish: $("finish"), scrub: $("scrub"), speed: $("speed"), narration: $("narration"),
    run: $("run"), error: $("error"), results: $("results"), steps: $("steps"), powers: $("powers"), glossary: $("glossary"),
  };
  const IDLE = "Press run to animate.";

  const TERMS = {
    "Imaginary unit i": "The number with i² = −1. No real number squares to a negative, so i lives off the real line, one unit up the imaginary axis.",
    "z": "A complex number a + bi: a real part a plus an imaginary part b·i. Plotted as the point (a, b) on the complex plane.",
    "Real part": "a, the horizontal coordinate. When b = 0, z is an ordinary real number on the real axis.",
    "Imaginary part": "b, the vertical coordinate (the number of i's). When a = 0, z is purely imaginary.",
    "Conjugate z̄": "a − bi: the same real part with the imaginary part's sign flipped, so z̄ is z mirrored across the real axis.",
    "Modulus |z|": "√(a² + b²): the distance from 0 to z, by Pythagoras on the legs a and b. z and z̄ are the same distance away.",
    "z · z̄": "(a + bi)(a − bi) = a² − b²i² = a² + b², always a real number, and equal to |z|².",
  };

  const state = { ...config.initial, show: {} };
  document.querySelectorAll("[data-show]").forEach((box) => { state.show[box.dataset.show] = box.checked; });

  const scene = new ManimCanvas($("scene"), { theme: config.theme });
  let timeline = null;
  let current = null;

  const swatch = (color) => `<span class="swatch" style="background:${color}"></span>`;
  const written = new WeakMap();
  const setHTML = (node, markup) => { if (written.get(node) !== markup) { node.innerHTML = markup; written.set(node, markup); } };

  function renderGlossary() {
    el.glossary.innerHTML = Object.entries(TERMS).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("");
  }

  // ---- Panels -----------------------------------------------------------------
  const rows = (items) => items.map(([id, k, v]) =>
    `<dt data-step="${id}" title="${TERMS[k] || ""}">${k}</dt><dd data-step="${id}">${v}</dd>`).join("");

  function renderResults(sol) {
    const t = sol.texts;
    setHTML(el.results, rows([
      ["z", "z", `${swatch(C.z)}${t.z}`],
      ["z", "Real part", `a = ${fmt(sol.z.re)}`],
      ["z", "Imaginary part", `b = ${fmt(sol.z.im)}`],
      ["conjugate", "Conjugate z̄", `${swatch(C.conjugate)}${t.conjugate}`],
      ["modulus", "Modulus |z|", `${swatch(C.modulus)}${t.modulus}`],
      ["product", "z · z̄", `${t.product} = |z|²`],
      ["z", "Where", sol.kind],
    ]));
  }

  function renderSteps(sol) {
    setHTML(el.steps, sol.steps.map(({ id, title, math }) =>
      `<li class="steps__item" data-step="${id}"><p class="steps__title">${title}</p><p class="steps__math">${math}</p></li>`).join(""));
  }

  function renderPowers(sol) {
    const sup = ["⁰", "¹", "²", "³", "⁴"];
    setHTML(el.powers, sol.powers.map(({ n, text }) =>
      `<li class="powers__item${n === 2 ? " is-key" : ""}"><p class="powers__exp">i${sup[n]}</p><p class="powers__value">${text}</p></li>`).join(""));
  }

  function highlight(step) {
    el.narration.textContent = step ? step.caption : IDLE;
    document.querySelectorAll("[data-step]").forEach((node) => {
      node.classList.toggle("is-active", !!step && node.dataset.step === step.id);
    });
  }

  // ---- Drawing helpers ------------------------------------------------------------
  /** A circle about 0 of radius r, traced anticlockwise from the positive real axis. */
  function circle(r, p, color, { width = 2, dash = null } = {}) {
    if (p <= 0 || r <= 0) return;
    scene.withClip(() => {
      const { ctx } = scene;
      const cx = scene.px(0), cy = scene.py(0);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      if (dash) ctx.setLineDash(dash);
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.abs(scene.px(r) - cx), Math.abs(scene.py(r) - cy), 0, 0, -2 * Math.PI * p, true);
      ctx.stroke();
    });
  }

  // ---- Timeline -------------------------------------------------------------
  function buildTimeline(sol) {
    const show = state.show;
    const { re: a, im: b } = sol.z;
    const r = sol.modulus;
    const t = sol.texts;
    const tl = new Timeline(scene, {
      onFrame: (time, total) => { el.scrub.value = total ? Math.round((time / total) * 1000) : 1000; },
      onStep: highlight,
      onDone: () => setPlaying(false),
    });
    tl.speed = Number(el.speed.value);

    if (show.grid) tl.add({ id: "axes", caption: "The complex plane: real part across, imaginary part up", duration: 0.8, draw: (p) => scene.grid(p) });
    tl.add({
      id: "axes", caption: "The complex plane: real part across, imaginary part up", duration: 1.0, parallel: show.grid,
      draw: (p) => {
        scene.axes(p);
        if (show.labels) {
          const v = scene.view;
          scene.label("Re", v.x_max, 0, p, C.unit, { dx: -8, dy: -16, align: "right" });
          scene.label("Im", 0, v.y_max, p, C.unit, { dx: 10, dy: 12 });
        }
      },
    });

    if (show.powers) {
      // 1 → i → −1: two quarter turns. Afterwards the unit circle and the marks for 1, i, −1 stay as a guide.
      tl.add({
        id: "i", caption: "i · i = i² = −1: multiplying by i turns a quarter turn, so two turns take 1 to −1", duration: 2.0, wait: 0.2,
        draw: (p, local) => {
          circle(1, 1, C.unit, { width: 1.5, dash: [5, 5] });
          const angle = Math.PI * p;
          [[1, 0, "1", 0], [0, 1, "i", 0.5], [-1, 0, "i² = −1", 1]].forEach(([x, y, label, at]) => {
            if (p + 1e-9 < at) return;
            scene.dot(x, y, 1, C.i, 5);
            if (show.labels) scene.label(label, x, y, 1, C.i, { dx: x < 0 ? -8 : 8, dy: y ? -12 : 14, align: x < 0 ? "right" : "left", size: 13 });
          });
          if (local < 1) scene.dot(Math.cos(angle), Math.sin(angle), 1, C.z, 6);
        },
      });
    }

    if (show.parts) {
      tl.add({
        id: "z", caption: `Real part: go a = ${fmt(a)} along the real axis`, duration: 0.9,
        draw: (p) => {
          scene.line(0, 0, a, 0, p, C.parts, { width: 3 });
          if (show.labels && a) scene.label(`a = ${fmt(a)}`, a / 2, 0, p, C.parts, { dx: 0, dy: b < 0 ? -14 : 14, align: "center", size: 13 });
        },
      });
      tl.add({
        id: "z", caption: `Imaginary part: go b = ${fmt(b)} up (b lots of i)`, duration: 0.9,
        draw: (p) => {
          scene.line(a, 0, a, b, p, C.parts, { width: 3 });
          if (show.labels && b) scene.label(`b = ${fmt(b)}`, a, b / 2, p, C.parts, { dx: a < 0 ? -8 : 8, dy: 0, align: a < 0 ? "right" : "left", size: 13 });
        },
      });
    }
    tl.add({
      id: "z", caption: `z = a + bi = ${t.z}: the point (${fmt(a)}, ${fmt(b)})`, duration: 0.7,
      draw: (p) => {
        scene.dot(a, b, p, C.z);
        if (show.labels) scene.label(`z = ${t.z}`, a, b, p, C.z, { dx: a < 0 ? -12 : 12, dy: b < 0 ? 16 : -16, align: a < 0 ? "right" : "left" });
      },
    });
    tl.add({ id: "z", duration: 0.6, parallel: true, rate: rate.linear, draw: (p) => scene.flash(a, b, p, C.z) });

    if (show.conjugate) {
      tl.add({
        id: "conjugate", caption: `Conjugate z̄ = a − bi = ${t.conjugate}: z mirrored across the real axis`, duration: 1.1,
        draw: (p) => {
          if (b) scene.line(a, b, a, -b, p, C.conjugate, { dash: [6, 5] });
          scene.dot(a, b + (-b - b) * p, 1, C.conjugate, 6);
          if (show.labels && p > 0.9) scene.label(`z̄ = ${t.conjugate}`, a, -b, 1, C.conjugate, { dx: a < 0 ? -12 : 12, dy: b < 0 ? -16 : 16, align: a < 0 ? "right" : "left" });
        },
      });
    }

    if (show.modulus) {
      tl.add({
        id: "modulus", caption: `|z| = √(a² + b²) = ${t.modulus}: the distance from 0 to z`, duration: 1.0,
        draw: (p) => {
          scene.line(0, 0, a, b, p, C.modulus, { width: 3 });
          if (show.labels && r) scene.label(`|z| = ${t.modulus}`, a / 2, b / 2, p, C.modulus, { dx: a * b < 0 ? 10 : -10, dy: -10, align: a * b < 0 ? "left" : "right", size: 13 });
        },
      });
      tl.add({
        id: "modulus", caption: `Every point ${t.modulus} from 0, z and z̄ included`, duration: 1.4,
        draw: (p) => circle(r, p, C.modulus, { width: 1.5, dash: [3, 5] }),
      });
    }
    tl.add({ id: "product", caption: `z · z̄ = a² + b² = ${t.product} = |z|²`, duration: 1.2, rate: rate.linear, draw: () => {} });
    return tl;
  }

  // ---- Camera: the origin in the middle, equal units across and up ------------
  function ideal(sol) {
    const extent = Math.max(sol.modulus, 1) * 1.2 + 0.6;
    const k = (scene.width - 2 * scene.margin) / (scene.height - 2 * scene.margin) || 16 / 9;
    const [hx, hy] = k >= 1 ? [extent * k, extent] : [extent, extent / k];
    const step = niceStep(2 * Math.min(hx, hy), 6);
    return { x_min: -hx, x_max: hx, y_min: -hy, y_max: hy, x_step: step, y_step: step };
  }

  function frame(sol, { refit = false } = {}) {
    const target = ideal(sol);
    const r = Math.max(sol.modulus, 1);
    const points = [[r, 0], [-r, 0], [0, r], [0, -r]];
    if (!refit && scene.targetView && !view.shouldRefit(scene.targetView, target, points)) return;
    scene.moveTo(target, { onFrame: () => { if (timeline && !timeline.playing) timeline.render(); } });
  }

  // ---- Controls -------------------------------------------------------------
  function setPlaying(playing) { el.play.textContent = playing ? "❚❚ Pause" : "▶ Play"; }

  function syncInputs() {
    for (const key of ["a", "b"]) {
      $(`${key}-range`).value = state[key];
      $(`${key}-num`).value = state[key];
    }
  }

  function update({ fromConfig = false, refit = false } = {}) {
    if (timeline) timeline.stop();
    setPlaying(false);
    if ([state.a, state.b].some((n) => !Number.isFinite(n))) {
      el.error.textContent = "Enter a number for a and b.";
      el.error.hidden = false;
      return;
    }
    el.error.hidden = true;
    const sol = fromConfig ? config.solution : solve(state.a, state.b);
    current = sol;
    renderResults(sol);
    renderSteps(sol);
    renderPowers(sol);
    timeline = buildTimeline(sol);
    timeline.finish();
    frame(sol, { refit });
    PPParams.write({ a: state.a, b: state.b });
  }

  function readHash() {
    const values = PPParams.read(["a", "b"]);
    Object.assign(state, values);
    return Object.keys(values).length > 0;
  }

  function play() {
    if (!timeline) return;
    el.run.hidden = true;
    timeline.play();
    setPlaying(true);
  }

  for (const key of ["a", "b"]) {
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
      [state.a, state.b] = button.dataset.preset.split(",").map(Number);
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
  // A new canvas shape changes the units per pixel, so re-square the plane.
  scene.onResize = () => { if (current) scene.setView(ideal(current)); if (timeline) timeline.render(); };
  window.addEventListener("hashchange", () => { if (readHash()) { syncInputs(); update(); } });

  renderGlossary();
  const fromHash = readHash();
  syncInputs();
  scene.setView(ideal(config.solution));
  update({ fromConfig: !fromHash });
})();
