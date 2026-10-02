/*
 * vertex_form.js — page controller for the vertex form y = a(x − h)² + k.
 *
 * Reads the Python-built config, wires the form drop-down and the three sliders,
 * and turns a solution into a Manim-style Timeline that builds the parabola
 * from y = x²: the curve slides sideways by h, stretches (or flips) by a and
 * lifts by k, carrying the vertex from (0, 0) to (h, k). Changing the form
 * rewrites the same parabola in the new form's variables, and a = 0 shows the
 * line the parabola flattens into, so sliders pass straight through it. The URL
 * hash (#a=2&h=1&k=-8, #a=1&b=-6&c=5 or #a=-1&r1=-1&r2=5) presets the quadratic
 * and is watched, so links and PP.embed(...).set() update the page live.
 */
(function () {
  "use strict";
  const { ManimCanvas, Timeline, rate, view } = window.Manim;
  const { solve, fmt, PARAMS, to_standard: toStandard } = window.VertexMath;
  const { framing, solve_linear: solveLinear } = window.QuadMath;

  const config = JSON.parse(document.getElementById("pp-config").textContent);
  const C = Object.fromEntries(Object.entries(config.roles).map(([el, role]) => [el, config.theme.stage[role]]));
  const SLOTS = ["p0", "p1", "p2"];

  const $ = (id) => document.getElementById(id);
  const el = {
    play: $("play"), finish: $("finish"), scrub: $("scrub"), speed: $("speed"), narration: $("narration"),
    run: $("run"), error: $("error"), warning: $("warning"), note: $("note"), form: $("form"), formAbout: $("form-about"),
    paramTerms: $("param-terms"), forms: $("forms"), results: $("results"), glossary: $("glossary"),
    transformations: $("transformations"), equation: $("equation"), conversions: $("conversions"),
  };
  const IDLE = "Press run to animate.";

  const FORM_INFO = {
    vertex: {
      name: "Vertex form", general: "y = a(x − h)² + k",
      about: "Shows the turning point (h, k) directly: the parabola y = x² moved so its vertex sits there.",
      vars: [["a", "stretch: |a| > 1 narrower, |a| < 1 wider, a < 0 flips it upside down"], ["h", "horizontal shift: the vertex's x, and the axis of symmetry x = h"], ["k", "vertical shift: the vertex's y, the minimum (a > 0) or maximum (a < 0)"]],
    },
    standard: {
      name: "Standard form", general: "y = ax² + bx + c",
      about: "Hides the vertex inside b and c; completing the square brings it out as a(x − h)² + k.",
      vars: [["a", "leading coefficient: the same a as in the vertex form"], ["b", "linear coefficient: with a, sets h = −b / 2a"], ["c", "constant term: the y-intercept (0, c)"]],
    },
    factored: {
      name: "Factored form", general: "y = a(x − r₁)(x − r₂)",
      about: "Shows the roots; the vertex sits midway between them, at h = (r₁ + r₂) / 2.",
      vars: [["a", "leading coefficient: the same a as in the vertex form"], ["r₁", "first root: y = 0 at x = r₁"], ["r₂", "second root: y = 0 at x = r₂"]],
    },
  };
  const TERMS = {
    "Parent function": "y = x², the simplest parabola: vertex (0, 0), opening up. Every parabola is this one shifted, stretched and lifted.",
    "Vertex (h, k)": "The turning point. In a(x − h)² + k the square is 0 only at x = h, so there y = k.",
    "Axis of symmetry": "The vertical line x = h through the vertex; the parabola mirrors itself across it.",
    "Minimum / maximum": "(x − h)² is never negative, so a > 0 puts the lowest point at k and a < 0 the highest.",
    "Range": "Every y the parabola reaches: y ≥ k when it opens up, y ≤ k when it opens down.",
    "Width": "|a| scales every height: above 1 the curve is narrower than y = x², below 1 wider.",
    "Completing the square": "Adding and subtracting (b / 2a)² inside the bracket turns x² + (b/a)x into a perfect square (x − h)².",
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

  /** a = 0: no x² term, so the "parabola" is the line y = bx + c (in vertex form, the flat line y = k). */
  function linearSolution(form, p, q) {
    const [, b, c] = toStandard(form, 0, p, q);
    const line = solveLinear(b, c);
    return {
      linear: true, form, standard: { a: 0, b, c }, vertex: null, factored: null, quadratic: line,
      equation: line.standard_form, forms: { standard: line.standard_form, vertex: null, factored: null },
      transformations: [], features: null, completing_square: [], shortcut: [], expanding: [], from_roots: null,
    };
  }

  function renderGlossary() {
    el.glossary.innerHTML = Object.entries(TERMS).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("");
  }

  // ---- The chosen form and its variables -----------------------------------
  function renderFormControls() {
    const info = FORM_INFO[state.form];
    el.form.value = state.form;
    el.formAbout.innerHTML = `<span class="form-general">${info.general}</span> ${info.about}`;
    info.vars.forEach(([sym], i) => {
      $(`${SLOTS[i]}-label`).innerHTML = `<span class="var">${sym}</span>`;
      $(`${SLOTS[i]}-range`).setAttribute("aria-label", `${sym} slider`);
    });
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
    setHTML(el.forms, ["vertex", "standard", "factored"].map((name) => {
      const text = sol.forms[name] || (sol.linear ? "none: a = 0 leaves a line" : "none: no real roots");
      return `<div class="forms-list__row${name === "vertex" ? " is-chosen" : ""}"><dt>${FORM_INFO[name].name}</dt><dd>${text}</dd></div>`;
    }).join(""));
  }

  const rows = (items) => items.map(([id, k, v]) =>
    `<dt data-step="${id}" title="${TERMS[k] || ""}">${k}</dt><dd data-step="${id}">${v}</dd>`).join("");

  function renderResults(sol) {
    const quad = sol.quadratic;
    if (sol.linear) {
      const roots = quad.root === null ? quad.root_nature : `${swatch(C.roots)}x = ${fmt(quad.root)}`;
      setHTML(el.results, rows([
        ["vertex", "Vertex (h, k)", "none: a = 0, so this is a line, not a parabola"],
        ["roots", "Roots", roots],
        ["intercepts", "y-intercept", `${swatch(C.y_intercept)}${point(...quad.y_intercept)}`],
      ]));
      return;
    }
    const f = sol.features;
    const roots = quad.x_intercepts.length
      ? quad.x_intercepts.map(([x]) => `${swatch(C.roots)}x = ${fmt(x)}`).join(",  ")
      : "none: the curve never reaches y = 0";
    setHTML(el.results, rows([
      ["vertex", "Vertex (h, k)", `${swatch(C.vertex)}${point(...f.vertex)}`],
      ["symmetry", "Axis of symmetry", `${swatch(C.symmetry)}x = ${fmt(f.axis)}`],
      ["vertex", "Minimum / maximum", f.extreme],
      ["lift", "Range", f.range],
      ["stretch", "Width", `${f.width}, opens ${f.opens}`],
      ["roots", "Roots", roots],
      ["intercepts", "y-intercept", `${swatch(C.y_intercept)}${point(...quad.y_intercept)}`],
    ]));
  }

  function renderTransformations(sol) {
    if (sol.linear) {
      setHTML(el.transformations, `<li class="moves__item"><p class="moves__why">With a = 0 every height is multiplied by 0: y = x² is squashed flat, leaving ${sol.equation}. Move <span class="var">a</span> away from 0.</p></li>`);
      setHTML(el.equation, `<span class="build__label">Not a parabola</span> ${sol.equation}`);
      return;
    }
    setHTML(el.transformations, sol.transformations.map((t) => `
      <li class="moves__item" data-step="${t.id}">
        <p class="moves__title">${t.title}</p>
        <p class="moves__equation">${t.equation}</p>
        <p class="moves__why">${t.math}</p>
      </li>`).join(""));
    setHTML(el.equation, `<span class="build__label">Vertex form</span> ${sol.equation}`);
  }

  const stepList = (steps) => steps.map(({ title, math }) =>
    `<li class="steps__item"><p class="steps__title">${title}</p><p class="steps__math">${math}</p></li>`).join("");

  function renderConversions(sol) {
    if (sol.linear) {
      setHTML(el.conversions, `<p class="conversion__empty">With a = 0 there is no x² term, so there is no square to complete. Move <span class="var">a</span> away from 0.</p>`);
      return;
    }
    const square = { title: "Standard → vertex form: complete the square", steps: sol.completing_square, result: sol.equation, wide: true };
    const quick = { title: "The shortcut: h = −b / 2a, then k = f(h)", steps: sol.shortcut, result: sol.equation };
    const expand = { title: "Vertex → standard form: expand", steps: sol.expanding, result: sol.forms.standard };
    const roots = sol.from_roots && { title: "Factored → vertex form: midway between the roots", steps: sol.from_roots, result: sol.equation };
    const order = sol.form === "vertex" ? [expand, square, quick] : sol.form === "factored" ? [roots, expand, square, quick] : [square, quick, expand];
    setHTML(el.conversions, order.map((conv) => `
      <div class="conversion${conv.wide ? " conversion--wide" : ""}">
        <h3 class="conversion__title">${conv.title}</h3>
        <ol class="steps steps--compact">${stepList(conv.steps)}</ol>
        <p class="conversion__result">${conv.result}</p>
      </div>`).join(""));
  }

  function highlight(step) {
    el.narration.textContent = step ? step.caption : IDLE;
    document.querySelectorAll("[data-step]").forEach((node) => {
      node.classList.toggle("is-active", !!step && node.dataset.step === step.id);
    });
  }

  // ---- Timeline -------------------------------------------------------------
  /**
   * The parabola at each stage of the build: y = x², y = (x − h)², y = a(x − h)², y = a(x − h)² + k.
   * `morph(i, t)` is the curve partway (t from 0 to 1) from stage i − 1 to stage i, with its vertex.
   */
  function stages(a, h, k) {
    return (i, t) => {
      if (i === 1) return { f: (x) => (x - t * h) ** 2, v: [t * h, 0] };
      if (i === 2) { const s = 1 + t * (a - 1); return { f: (x) => s * (x - h) ** 2, v: [h, 0] }; }
      return { f: (x) => a * (x - h) ** 2 + t * k, v: [h, t * k] };
    };
  }

  function buildTimeline(sol) {
    const quad = sol.quadratic;
    const { a, b, c } = sol.standard;
    const show = state.show;
    const tl = new Timeline(scene, {
      onFrame: (t, total) => { el.scrub.value = total ? Math.round((t / total) * 1000) : 1000; },
      onStep: highlight,
      onDone: () => setPlaying(false),
    });
    tl.speed = Number(el.speed.value);
    const last = () => tl.steps[tl.steps.length - 1];
    const over = (step) => tl.time > step.end + 1e-9;

    if (show.grid) tl.add({ id: "parent", caption: "Set up the axes", duration: 0.8, draw: (p) => scene.grid(p) });
    tl.add({ id: "parent", caption: "Set up the axes", duration: 1.0, parallel: show.grid, draw: (p) => scene.axes(p) });

    if (sol.linear) {
      tl.add({ id: "lift", caption: `a = 0 flattens the parabola into ${sol.equation}`, duration: 1.6, draw: (p) => scene.curve((x) => b * x + c, p, C.curve) });
    } else {
      const { h, k } = sol.vertex;
      const at = stages(a, h, k);
      // The parent y = x²: traced, then left behind as a faint guide once the build moves on.
      tl.add({ id: "parent", caption: "Start from the parent parabola y = x², vertex (0, 0)", duration: 1.4, wait: 0.2, draw: (p) => {
        const done = over(parentStep);
        if (done && !show.parent) return;
        scene.curve((x) => x * x, p, done ? C.parent : C.curve, { width: done ? 2 : 4 });
        if (!done) scene.dot(0, 0, Math.min(1, p * 2), C.vertex, 6);
        else if (show.labels) scene.label("y = x²", 0, 0, 1, C.parent, { dx: 10, dy: 18 });
      } });
      const parentStep = last();
      // Each transformation moves the live curve; finished stages stay as a faint trail when "Each step's curve" is on.
      const moves = sol.transformations.slice(1);
      moves.forEach((move, i) => {
        const stage = i + 1;
        const idle = (stage === 1 && h === 0) || (stage === 2 && a === 1) || (stage === 3 && k === 0);
        tl.add({ id: move.id, caption: `${move.title}: ${move.equation}`, duration: idle ? 0.7 : 1.5, wait: 0.15, draw: (p) => {
          const final = stage === moves.length;
          const done = over(self) && !final;
          if (done && !show.trail) return;
          const { f, v } = at(stage, p);
          scene.curve(f, 1, done ? C.parent : C.curve, { width: done ? 2 : 4 });
          if (!done) {
            scene.dot(v[0], v[1], 1, C.vertex, 6);
            if (!idle && stage !== 2) scene.line(stage === 1 ? 0 : h, 0, v[0], v[1], 1, C.shift, { width: 2.5, dash: [6, 5] });
          }
        } });
        const self = last();
      });
      if (show.symmetry) {
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
      tl.add({
        id: "vertex", caption: `Vertex (h, k) = ${point(h, k)}: the ${sol.features.extreme}`, duration: 0.7,
        draw: (p) => {
          scene.dot(h, k, p, C.vertex);
          if (show.labels) scene.label(`vertex ${point(h, k)}`, h, k, p, C.vertex, { dy: below ? 22 : -22, dx: 0, align: "center" });
        },
      });
      tl.add({ id: "vertex", duration: 0.6, parallel: true, rate: rate.linear, draw: (p) => scene.flash(h, k, p, C.vertex) });
    }

    if (show.intercepts) {
      const below = sol.linear || quad.direction === "up";
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
          id: "roots", caption: sol.linear ? `Root x = ${fmt(x)}` : `Root x = h ± √(−k / a) = ${fmt(x)}`, duration: 0.6,
          draw: (p) => {
            scene.dot(x, 0, p, C.roots);
            if (show.labels) scene.label(`x = ${fmt(x)}`, x, 0, p, C.roots, side);
          },
        });
      });
      if (!xs.length && !sol.linear) {
        tl.add({ id: "roots", caption: "No real roots: −k / a < 0, so (x − h)² = −k / a has no solution", duration: 1.0, rate: rate.linear, draw: () => {} });
      }
    }
    tl.add({ id: "lift", caption: sol.equation, duration: 1.0, rate: rate.linear, draw: () => {} });
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
    if (sol.linear) el.warning.innerHTML = `<strong>Not a quadratic.</strong> With <span class="var">a</span> = 0 there is no x² term, so this is the line ${sol.equation}.`;
    renderForms(sol);
    renderResults(sol);
    renderTransformations(sol);
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

  /** The form is read from which keys the hash carries: h, k / b, c / r1, r2. */
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
