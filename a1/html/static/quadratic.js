/*
 * quadratic.js — page controller for the quadratic formula.
 *
 * Reads the Python-built config, wires the controls, and turns a solution
 * into a Manim-style Timeline. Colours come from the theme's stage palette via
 * config.roles (a1/style.py). The URL hash (#a=1&b=-3&c=2) presets values and
 * is watched, so links and PP.embed(...).set() update the page live.
 */
(function () {
  "use strict";
  const { ManimCanvas, Timeline, rate, view } = window.Manim;
  const { solve, solve_linear: solveLinear, framing, evaluate, fmt } = window.QuadMath;

  const config = JSON.parse(document.getElementById("pp-config").textContent);
  // Element -> colour, e.g. C.roots is the theme's "highlight" stage colour.
  const C = Object.fromEntries(Object.entries(config.roles).map(([el, role]) => [el, config.theme.stage[role]]));

  const $ = (id) => document.getElementById(id);
  const el = {
    play: $("play"), finish: $("finish"), scrub: $("scrub"), speed: $("speed"),
    narration: $("narration"), results: $("results"), steps: $("steps"), error: $("error"), run: $("run"),
    formEq: $("form-eq"), formAbout: $("form-about"), formTerms: $("form-terms"), glossary: $("glossary"),
  };
  const IDLE = "Press run to animate.";

  const state = { ...config.initial, show: {}, form: document.querySelector('input[name="form"]:checked').value };
  document.querySelectorAll("[data-show]").forEach((box) => { state.show[box.dataset.show] = box.checked; });

  const scene = new ManimCanvas($("scene"), { theme: config.theme, view: config.solution.window });
  let timeline = null;
  let current = null;  // the solution on screen, so the form toggle can re-render without re-solving

  // ---- Formatting helpers ---------------------------------------------------
  const paren = (n) => (n < 0 ? `(${fmt(n)})` : fmt(n));
  const point = ([x, y]) => `(${fmt(x)}, ${fmt(y)})`;
  const complex = ({ re, im }) => (im === 0 ? fmt(re) : `${fmt(re)} ${im < 0 ? "−" : "+"} ${fmt(Math.abs(im))}i`);
  const swatch = (color) => `<span class="swatch" style="background:${color}"></span>`;

  // ---- Definitions ----------------------------------------------------------
  // Plain-language meaning of every term in the Results panel (also shown as a tooltip on each row).
  const TERMS = {
    "Coefficients": "a multiplies x², b multiplies x, and c is the constant term in ax² + bx + c.",
    "Discriminant Δ": "b² − 4ac, the part under the square root. Positive: two real roots. Zero: one repeated root. Negative: two complex roots, and the curve never touches the x-axis.",
    "Roots": "The solutions of ax² + bx + c = 0, i.e. the x values that make y = 0. They can be real or complex.",
    "Root": "The x value that makes y = 0. With a = 0 the equation is linear, bx + c = 0, so x = −c / b.",
    "x-intercepts": "Points where the curve crosses the x-axis (y = 0). These are the real roots.",
    "Vertex": "The turning point (h, k) of the parabola: its lowest point when it opens up, its highest when it opens down.",
    "Axis of symmetry": "The vertical line x = h through the vertex. The parabola is a mirror image on either side of it.",
    "y-intercept": "Where the curve crosses the y-axis (x = 0). It is always (0, c).",
    "Opens": "Up when a > 0, down when a < 0. The larger |a| is, the narrower the parabola.",
    "Equation": "With a = 0 there is no x² term, so the graph is a straight line rather than a parabola.",
  };
  const define = (term) => TERMS[term] || "";

  function renderGlossary() {
    el.glossary.innerHTML = Object.entries(TERMS).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("");
  }

  // ---- Equation form toggle -------------------------------------------------
  // Each form: its general shape, what it reveals, and what each letter stands for (with the current values).
  function formView(sol, form) {
    const a = ["a", fmt(sol.a), "stretch and direction: opens up if a > 0, down if a < 0; larger |a| is narrower"];
    if (form === "standard") {
      return {
        general: "y = ax² + bx + c",
        about: "Shows the coefficients directly; c is the y-intercept.",
        equation: sol.standard_form,
        terms: [a, ["b", fmt(sol.b), "coefficient of x; with a, it sets where the vertex sits (h = −b / 2a)"],
          ["c", `${swatch(C.y_intercept)}${fmt(sol.c)}`, "constant term: the y-intercept (0, c)"]],
      };
    }
    if (sol.linear) {
      return {
        general: form === "vertex" ? "y = a(x − h)² + k" : "y = a(x − r₁)(x − r₂)",
        about: `a = 0, so this is the line ${sol.standard_form}. ${form === "vertex" ? "Vertex" : "Intercept"} form needs an x² term.`,
        equation: "not defined for a line",
        terms: [],
      };
    }
    if (form === "vertex") {
      const [h, k] = sol.vertex;
      return {
        general: "y = a(x − h)² + k",
        about: "Shows the vertex (h, k) directly, so you can read off the turning point and axis of symmetry.",
        equation: sol.vertex_form,
        terms: [a, ["h", `${swatch(C.vertex)}${fmt(h)}`, "x-coordinate of the vertex, h = −b / 2a; also the axis of symmetry x = h"],
          ["k", `${swatch(C.vertex)}${fmt(k)}`, `y-coordinate of the vertex, k = f(h): the ${sol.direction === "up" ? "minimum" : "maximum"} value of y`]],
      };
    }
    const general = "y = a(x − r₁)(x − r₂)";
    const about = "Shows the x-intercepts directly (also called factored form): y = 0 exactly when x = r₁ or x = r₂.";
    if (!sol.x_intercepts.length) {
      return {
        general, about: `${about} Here Δ < 0, so there are no real x-intercepts to write it with.`,
        equation: "not factorable over the reals", terms: [a],
      };
    }
    const rs = sol.x_intercepts.map(([x]) => `${swatch(C.roots)}${fmt(x)}`);
    const terms = rs.length === 1
      ? [a, ["r", rs[0], "the repeated root: the curve just touches the x-axis at the vertex, so y = a(x − r)²"]]
      : [a, ["r₁", rs[0], "first x-intercept (root)"], ["r₂", rs[1], "second x-intercept (root)"]];
    return { general, about, equation: sol.factored_form, terms };
  }

  function renderForm(sol) {
    const shown = formView(sol, state.form);
    el.formEq.textContent = shown.equation;
    el.formAbout.innerHTML = `<span class="form-general">${shown.general}</span> ${shown.about}`;
    el.formTerms.innerHTML = shown.terms.map(([sym, value, meaning]) =>
      `<dt><span class="var">${sym}</span> = ${value}</dt><dd>${meaning}</dd>`).join("");
  }

  // ---- Side panel -----------------------------------------------------------
  const resultRows = (rows) => rows.map(([id, k, v]) =>
    `<dt data-step="${id}" title="${define(k)}">${k}</dt><dd data-step="${id}">${v}</dd>`).join("");

  function renderResults(sol) {
    if (sol.linear) {
      const rows = [
        ["curve", "Equation", `a = 0, so this is a line, not a parabola`],
        ["roots", "Root", `${swatch(C.roots)}${sol.root === null ? sol.root_nature : `x = ${fmt(sol.root)}`}`],
        ["yint", "y-intercept", `${swatch(C.y_intercept)}${point(sol.y_intercept)}`],
      ];
      el.results.innerHTML = resultRows(rows);
      return;
    }
    const realRoots = sol.x_intercepts.map(([x]) => fmt(x)).join(", ");
    const rows = [
      ["discriminant", "Discriminant Δ", `${swatch(C.discriminant)}${fmt(sol.discriminant)} — ${sol.root_nature}`],
      ["roots", "Roots", `${swatch(C.roots)}${sol.roots.map(complex).join(", ")}`],
      ["roots", "x-intercepts", realRoots || "none (curve doesn't cross the x-axis)"],
      ["vertex", "Vertex", `${swatch(C.vertex)}${point(sol.vertex)} (${sol.direction === "up" ? "minimum" : "maximum"})`],
      ["symmetry", "Axis of symmetry", `${swatch(C.symmetry)}x = ${fmt(sol.axis_of_symmetry)}`],
      ["yint", "y-intercept", `${swatch(C.y_intercept)}${point(sol.y_intercept)}`],
      ["curve", "Opens", sol.direction],
    ];
    el.results.innerHTML = resultRows(rows);
  }

  function renderSteps(sol) {
    if (sol.linear) {
      const { b, c } = sol;
      const items = [
        ["setup", "Identify the coefficients", `a = 0,  b = ${fmt(b)},  c = ${fmt(c)}`],
        ["curve", "a = 0: no x² term", `y = ${fmt(b)}x + ${paren(c)} is a straight line`],
        ["roots", "Solve bx + c = 0", b === 0 ? sol.root_nature : `x = −c / b = −${paren(c)} / ${paren(b)} = ${fmt(sol.root)}`],
      ];
      el.steps.innerHTML = items.map(([id, title, math]) =>
        `<li class="steps__item" data-step="${id}"><p class="steps__title">${title}</p><p class="steps__math">${math}</p></li>`).join("");
      return;
    }
    const { a, b, c, discriminant: d } = sol;
    const sqrt = d >= 0 ? fmt(Math.sqrt(d)) : `${fmt(Math.sqrt(-d))}i`;
    const [r1, r2] = sol.roots;
    const roots = r1.re === r2.re && r1.im === r2.im ? `x = ${complex(r1)} (repeated)` : `x₁ = ${complex(r1)},  x₂ = ${complex(r2)}`;
    const items = [
      ["setup", "Identify the coefficients", `a = ${fmt(a)},  b = ${fmt(b)},  c = ${fmt(c)}`],
      ["discriminant", "Discriminant", `Δ = b² − 4ac = ${paren(b)}² − 4·${paren(a)}·${paren(c)} = ${fmt(d)}`],
      ["discriminant", d < 0 ? "Square root (Δ < 0, so the roots are complex)" : "Square root", `√Δ = ${sqrt}`],
      ["roots", "Quadratic formula", `x = (−${paren(b)} ± ${sqrt}) / (2·${paren(a)})`],
      ["roots", "Roots", roots],
      ["vertex", "Vertex", `h = −b / 2a = ${fmt(sol.vertex[0])},  k = f(h) = ${fmt(sol.vertex[1])}`],
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

  // ---- Timeline: the "construct()" of this page -----------------------------
  function buildTimeline(sol) {
    const { a, b, c, show } = { ...sol, show: state.show };
    const f = (x) => evaluate(a, b, c, x);
    const [h, k] = sol.vertex || [0, 0];
    const tl = new Timeline(scene, {
      onFrame: (t, total) => { el.scrub.value = total ? Math.round((t / total) * 1000) : 1000; },
      onStep: highlight,
      onDone: () => setPlaying(false),
    });
    tl.speed = Number(el.speed.value);
    // Draw functions read scene.view at draw time: the camera may be gliding between frames.

    if (show.grid) tl.add({ id: "setup", caption: "Set up the axes", duration: 0.8, draw: (p) => scene.grid(p) });
    tl.add({ id: "setup", caption: "Set up the axes", duration: 1.2, parallel: show.grid, draw: (p) => scene.axes(p) });
    tl.add({ id: "curve", caption: `Plot ${sol.standard_form}`, duration: 1.8, wait: 0.2, draw: (p) => scene.curve(f, p) });
    if (sol.linear) return addLinearSteps(tl, sol, show);
    tl.add({ id: "discriminant", caption: `Δ = b² − 4ac = ${fmt(sol.discriminant)} → ${sol.root_nature}`, duration: 1.4, rate: rate.linear, draw: () => {} });

    if (show.symmetry) {
      tl.add({
        id: "symmetry", caption: `Axis of symmetry: x = −b / 2a = ${fmt(h)}`, duration: 0.9,
        draw: (p) => {
          const v = scene.view;
          scene.line(h, v.y_min, h, v.y_max, p, C.symmetry, { dash: [8, 6] });
          if (show.labels) scene.label(`x = ${fmt(h)}`, h, v.y_max, p, C.symmetry, { dy: 14, dx: 6 });
        },
      });
    }
    if (show.vertex) {
      const below = sol.direction === "up";
      tl.add({
        id: "vertex", caption: `Vertex ${point(sol.vertex)} is the ${below ? "minimum" : "maximum"}`, duration: 0.7,
        draw: (p) => {
          scene.dot(h, k, p, C.vertex);
          if (show.labels) scene.label(`vertex ${point(sol.vertex)}`, h, k, p, C.vertex, { dy: below ? 22 : -22, dx: 0, align: "center" });
        },
      });
      tl.add({ id: "vertex", duration: 0.6, parallel: true, rate: rate.linear, draw: (p) => scene.flash(h, k, p, C.vertex) });
    }
    if (show.yint) {
      tl.add({
        id: "yint", caption: `y-intercept: f(0) = c = ${fmt(c)}`, duration: 0.7,
        draw: (p) => {
          scene.dot(0, c, p, C.y_intercept);
          if (show.labels) scene.label(`(0, ${fmt(c)})`, 0, c, p, C.y_intercept, { dx: -10, align: "right" });
        },
      });
    }
    if (show.roots) {
      if (sol.x_intercepts.length) {
        const single = sol.x_intercepts.length === 1;
        sol.x_intercepts.forEach(([x], i) => {
          // Push each root label outward (left root left, right root right) so it clears the vertex label.
          // A repeated root sits on the vertex, so its label goes on the opposite side to the vertex label.
          const side = single
            ? { dx: -10, dy: sol.direction === "up" ? -20 : 20, align: "right" }
            : i === 0 ? { dx: -8, dy: 20, align: "right" } : { dx: 8, dy: 20, align: "left" };
          tl.add({
            id: "roots", caption: sol.x_intercepts.length === 1 ? `Repeated root x = ${fmt(x)}` : `Root x${i ? "₂" : "₁"} = ${fmt(x)}`,
            duration: 0.7,
            draw: (p) => {
              scene.dot(x, 0, p, C.roots);
              if (show.labels) scene.label(`x = ${fmt(x)}`, x, 0, p, C.roots, side);
            },
          });
          tl.add({ id: "roots", duration: 0.6, parallel: true, rate: rate.linear, draw: (p) => scene.flash(x, 0, p, C.roots) });
        });
      } else {
        const text = `No real roots: x = ${sol.roots.map(complex).join(", ")}`;
        tl.add({
          id: "roots", caption: `${text} — the curve never meets the x-axis`, duration: 1,
          draw: (p) => scene.label(text, scene.view.x_min, scene.view.y_max, p, C.roots, { dx: 12, dy: 18 }),
        });
      }
    }
    return tl;
  }

  /** a = 0: the parabola has flattened into y = bx + c. */
  function addLinearSteps(tl, sol, show) {
    const { c } = sol;
    tl.add({ id: "curve", caption: `a = 0: the parabola flattens into the line ${sol.standard_form}`, duration: 1.2, rate: rate.linear, draw: () => {} });
    if (show.yint) {
      tl.add({
        id: "yint", caption: `y-intercept: c = ${fmt(c)}`, duration: 0.7,
        draw: (p) => {
          scene.dot(0, c, p, C.y_intercept);
          if (show.labels) scene.label(`(0, ${fmt(c)})`, 0, c, p, C.y_intercept, { dx: -10, align: "right" });
        },
      });
    }
    if (show.roots && sol.root !== null) {
      const x = sol.root;
      tl.add({
        id: "roots", caption: `Root x = −c / b = ${fmt(x)}`, duration: 0.7,
        draw: (p) => {
          scene.dot(x, 0, p, C.roots);
          if (show.labels) scene.label(`x = ${fmt(x)}`, x, 0, p, C.roots, { dy: 20, align: "center", dx: 0 });
        },
      });
      tl.add({ id: "roots", duration: 0.6, parallel: true, rate: rate.linear, draw: (p) => scene.flash(x, 0, p, C.roots) });
    }
    return tl;
  }

  // ---- Controls -------------------------------------------------------------
  function setPlaying(playing) { el.play.textContent = playing ? "❚❚ Pause" : "▶ Play"; }

  function syncInputs() {
    for (const key of ["a", "b", "c"]) {
      $(`${key}-range`).value = state[key];
      $(`${key}-num`).value = state[key];
    }
  }

  /**
   * Keep the axes fixed unless a nearby key point (vertex, root, y-intercept)
   * would leave the view, or the curve shrinks to a small part of it; then ease
   * there on the camera spring. `refit` forces a reframe (presets).
   */
  function frame(sol, { refit = false } = {}) {
    const { points, window: ideal } = framing(sol);
    const target = refit ? view.roomy(ideal) : view.follow(scene.targetView, ideal, points);
    if (!target) return;
    scene.moveTo(target, { onFrame: () => { if (timeline && !timeline.playing) timeline.render(); } });
  }

  function update({ fromConfig = false, refit = false } = {}) {
    if (timeline) timeline.stop();
    setPlaying(false);
    if ([state.a, state.b, state.c].some((n) => !Number.isFinite(n))) {
      el.error.textContent = "Enter a number for a, b and c.";
      el.error.hidden = false;
      return;
    }
    el.error.hidden = true;
    // a = 0 is the linear limit of the parabola, so sliders pass straight through it.
    const sol = fromConfig ? config.solution : state.a === 0 ? solveLinear(state.b, state.c) : solve(state.a, state.b, state.c);
    current = sol;
    renderResults(sol);
    renderForm(sol);
    renderSteps(sol);
    timeline = buildTimeline(sol);
    timeline.finish();
    frame(sol, { refit });
    PPParams.write({ a: state.a, b: state.b, c: state.c });
  }

  /** Pull a/b/c from the URL hash; returns true if any were present. */
  function readHash() {
    const values = PPParams.read(["a", "b", "c"]);
    Object.assign(state, values);
    return Object.keys(values).length > 0;
  }

  /** Replay the whole scene from the start. */
  function play() {
    if (!timeline) return;
    el.run.hidden = true;
    timeline.play();
    setPlaying(true);
  }

  for (const key of ["a", "b", "c"]) {
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
      [state.a, state.b, state.c] = button.dataset.preset.split(",").map(Number);
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

  if (config.video) {
    $("video").src = config.video;
    $("video-wrap").hidden = false;
  }

  // Hash changes from outside (links, PP.embed(...).set()) update the page.
  window.addEventListener("hashchange", () => { if (readHash()) { syncInputs(); update(); } });

  renderGlossary();
  const fromHash = readHash();
  syncInputs();
  update({ fromConfig: !fromHash });
})();
