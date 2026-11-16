/*
 * functions.js — page controller for functions, domain & range.
 *
 * Reads the Python-built config, wires the controls, and turns a solution into a Manim-style
 * Timeline: the graph of the rule (in pieces where the domain has a gap), its asymptotes, the
 * domain shaded on the x-axis and the range on the y-axis, then the vertical line x = x₀ sweeping
 * down to meet the graph once (a function), twice (not a function) or not at all (x₀ outside the
 * domain). The URL hash (#a=1&h=2&k=0&x0=4&family=reciprocal) presets the inputs and is watched,
 * so links and PP.embed(...).set() update the page live.
 */
(function () {
  "use strict";
  const { ManimCanvas, Timeline, rate, view } = window.Manim;
  const { solve, fmt, rule, FAMILIES } = window.FunctionsMath;

  const config = JSON.parse(document.getElementById("pp-config").textContent);
  const C = Object.fromEntries(Object.entries(config.roles).map(([el, role]) => [el, config.theme.stage[role]]));
  const KEYS = ["a", "h", "k", "x0"];

  const $ = (id) => document.getElementById(id);
  const el = {
    play: $("play"), finish: $("finish"), scrub: $("scrub"), speed: $("speed"), narration: $("narration"),
    results: $("results"), steps: $("steps"), error: $("error"), run: $("run"), glossary: $("glossary"),
    verdict: $("verdict"), family: $("family"), about: $("family-about"),
  };
  const IDLE = "Press run to animate.";

  const state = { ...config.initial, show: {} };
  document.querySelectorAll("[data-show]").forEach((box) => { state.show[box.dataset.show] = box.checked; });

  const scene = new ManimCanvas($("scene"), { theme: config.theme, view: config.solution.window });
  let timeline = null;

  const paren = (n) => (n < 0 ? `(${fmt(n)})` : fmt(n));
  const point = (x, y) => `(${fmt(x)}, ${fmt(y)})`;
  const swatch = (color) => `<span class="swatch" style="background:${color}"></span>`;

  const ABOUT = {
    linear: "No denominator, even root or logarithm: every real x is allowed, and every real y comes out.",
    quadratic: "Every x is allowed, but the parabola turns at its vertex (h, k): the outputs stop at k.",
    reciprocal: "x − h is a denominator, so x = h is excluded. The output never reaches k either: a / (x − h) is never 0.",
    sqrt: "x − h sits under an even root, so it must be at least 0: x ≥ h. The root itself is never negative.",
    log: "ln needs a positive argument: x − h > 0, so x > h. The outputs run over every real number.",
    sideways: "A relation, not a function: each x > h (for a > 0) pairs with two y values, k ± √((x − h) / a).",
  };

  const TERMS = {
    "Function f": "A rule that assigns exactly one output f(x) to each allowed input x.",
    "f(x₀)": "Function notation: substitute x₀ for x in the rule. If f(x) = 2x + 1 then f(3) = 7.",
    "Domain": "All allowed inputs. Start from all real numbers and remove what makes a denominator 0, an even root's radicand negative, or a log's argument ≤ 0.",
    "Range": "All outputs the function actually produces.",
    "Interval notation": "[ ] includes the endpoint, ( ) excludes it, ∞ is never included, ∪ joins pieces: (−∞, 2) ∪ (2, ∞) is every x except 2.",
    "Vertical line test": "A graph is a function when no vertical line meets it more than once: each x maps to exactly one y.",
    "Asymptote": "A line the graph approaches but never reaches: x = h for 1 / (x − h) and ln(x − h), y = k for a / (x − h) + k.",
  };
  function renderGlossary() {
    el.glossary.innerHTML = Object.entries(TERMS).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("");
  }

  /** The restriction behind the domain, as text: "x − 2 ≠ 0, so x ≠ 2". */
  function restriction(sol) {
    const { family, a, h } = sol;
    const g = h === 0 ? "x" : `x ${h > 0 ? "−" : "+"} ${fmt(Math.abs(h))}`;
    if (family === "reciprocal") return `the denominator ${g} ≠ 0, so x ≠ ${fmt(h)}`;
    if (family === "sqrt") return `the radicand ${g} ≥ 0, so x ≥ ${fmt(h)}`;
    if (family === "log") return `the log's argument ${g} > 0, so x > ${fmt(h)}`;
    if (family === "sideways") return `y = k ± √((${g}) / ${paren(a)}) needs (${g}) / ${paren(a)} ≥ 0, so x ${a > 0 ? "≥" : "≤"} ${fmt(h)}`;
    return "no denominator, even root or logarithm: nothing to remove";
  }

  function rangeReason(sol) {
    const { family, a, k } = sol;
    if (family === "quadratic") return `(x − h)² ≥ 0, times a = ${fmt(a)}, so y ${a > 0 ? "≥" : "≤"} ${fmt(k)}: the vertex is the ${a > 0 ? "lowest" : "highest"} point`;
    if (family === "sqrt") return `√(x − h) ≥ 0, times a = ${fmt(a)}, so y ${a > 0 ? "≥" : "≤"} ${fmt(k)}`;
    if (family === "reciprocal") return `a / (x − h) is never 0, so y never equals ${fmt(k)}`;
    if (family === "sideways") return "y can be any real number: pick y, and x = a(y − k)² + h";
    return "every real number comes out";
  }

  function evaluation(sol) {
    const { family, a, h, k, x0 } = sol;
    if (!sol.in_domain) return `x₀ = ${fmt(x0)} is outside the domain: ${restriction(sol).split(", so ")[0]} fails (x₀ − h = ${fmt(x0 - h)})`;
    if (family === "sideways") return sol.hits.length === 1 ? `x = ${fmt(x0)} pairs with one y: ${fmt(sol.hits[0])} (the vertex)` : `x = ${fmt(x0)} pairs with y = ${fmt(k)} ± √((${fmt(x0)} − ${paren(h)}) / ${paren(a)}) = ${fmt(sol.hits[0])} and ${fmt(sol.hits[1])}`;
    const d = paren(x0 - h);
    const shape = { linear: `${paren(a)} · ${d}`, quadratic: `${paren(a)} · ${d}²`, reciprocal: `${paren(a)} / ${d}`, sqrt: `${paren(a)} · √${d}`, log: `${paren(a)} · ln ${d}` }[family];
    return `x₀ − h = ${fmt(x0)} − ${paren(h)} = ${fmt(x0 - h)}, so f(${fmt(x0)}) = ${shape} + ${paren(k)} = ${fmt(sol.value)}`;
  }

  function testText(sol) {
    if (!sol.is_function) {
      return sol.hits.length === 2
        ? `Not a function: the line x = ${fmt(sol.x0)} meets the graph twice.`
        : `Not a function: every vertical line with x ${sol.a > 0 ? ">" : "<"} ${fmt(sol.h)} meets the graph twice.`;
    }
    return `A function: every vertical line meets the graph at most once${sol.in_domain ? `; x = ${fmt(sol.x0)} meets it once` : `; x = ${fmt(sol.x0)} misses it (outside the domain)`}.`;
  }

  function renderResults(sol) {
    const out = sol.family === "sideways"
      ? (sol.hits.length ? sol.hits.map(fmt).join(" and ") : "none: outside the domain")
      : (sol.in_domain ? fmt(sol.value) : "undefined: outside the domain");
    const rows = [
      ["rule", "Rule", `${swatch(C.graph)}${sol.equation}`],
      ["domain", "Domain", `${swatch(C.domain)}${sol.domain_text}`],
      ["range", "Range", `${swatch(C.range)}${sol.range_text}`],
      ["evaluate", sol.family === "sideways" ? `y at x = ${fmt(sol.x0)}` : `f(${fmt(sol.x0)})`, out],
      ["test", "Function?", sol.is_function ? "yes: passes the vertical line test" : "no: fails the vertical line test"],
    ];
    el.results.innerHTML = rows.map(([id, k, v]) => `<dt data-step="${id}">${k}</dt><dd data-step="${id}">${v}</dd>`).join("");
    el.verdict.textContent = testText(sol);
    el.verdict.dataset.function = String(sol.is_function);
  }

  function renderSteps(sol) {
    const items = [
      ["rule", "The rule", `${sol.equation}${sol.family === "sideways" ? " (x in terms of y: a relation)" : ""}`],
      ["domain", "Domain: start from all real numbers, remove what breaks", `${restriction(sol)}  →  ${sol.domain_text}`],
      ["range", "Range: the outputs it produces", `${rangeReason(sol)}  →  ${sol.range_text}`],
      ["evaluate", sol.family === "sideways" ? "Outputs at x₀" : "Evaluate f(x₀): substitute x₀ for x", evaluation(sol)],
      ["test", "Vertical line test", testText(sol)],
    ];
    el.steps.innerHTML = items.map(([id, title, math]) =>
      `<li class="steps__item" data-step="${id}"><p class="steps__title">${title}</p><p class="steps__math">${math}</p></li>`).join("");
  }

  function highlight(step) {
    el.narration.textContent = step ? step.caption : IDLE;
    document.querySelectorAll("[data-step]").forEach((node) => node.classList.toggle("is-active", !!step && node.dataset.step === step.id));
  }

  // ---- Drawing ----------------------------------------------------------------
  /** The graph as polylines in math coordinates, split where the domain has a gap. */
  function branches(sol) {
    const v = scene.view, { family, a, h, k } = sol;
    const n = 400, H = v.y_max - v.y_min;
    const clamp = (y) => Math.min(Math.max(y, v.y_min - 2 * H), v.y_max + 2 * H);
    const sample = (lo, hi, f, bunch = 1) => Array.from({ length: n }, (_, i) => {
      const x = lo + (hi - lo) * Math.pow(i / (n - 1), bunch);
      return [x, clamp(f(x))];
    });
    if (family === "sideways") {
      return [Array.from({ length: n }, (_, i) => { const y = v.y_min + (H * i) / (n - 1); return [a * (y - k) ** 2 + h, y]; })];
    }
    const f = rule(family, a, h, k);
    if (family === "reciprocal") {
      const gap = (v.x_max - v.x_min) * 1e-4;
      return [
        h > v.x_min ? sample(Math.min(h, v.x_max) - gap, v.x_min, f, 3).reverse() : [],
        h < v.x_max ? sample(Math.max(h, v.x_min) + gap, v.x_max, f, 3) : [],
      ].filter((b) => b.length);
    }
    if (family === "sqrt" || family === "log") {
      if (h >= v.x_max) return [];
      const start = family === "log" ? Math.max(h, v.x_min) + (v.x_max - v.x_min) * 1e-6 : Math.max(h, v.x_min);
      return [sample(start, v.x_max, f, family === "log" ? 3 : 2)];
    }
    return [sample(v.x_min, v.x_max, f)];
  }

  function drawGraph(sol, p) {
    const { ctx } = scene;
    const parts = branches(sol);
    const total = parts.reduce((s, b) => s + b.length, 0);
    let left = Math.ceil(total * p);
    scene.withClip(() => {
      ctx.strokeStyle = C.graph; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.lineJoin = "round";
      for (const b of parts) {
        if (left <= 1) break;
        ctx.beginPath();
        b.slice(0, left).forEach(([x, y], i) => (i ? ctx.lineTo(scene.px(x), scene.py(y)) : ctx.moveTo(scene.px(x), scene.py(y))));
        ctx.stroke();
        left -= b.length;
      }
    });
  }

  /** A closed (filled) or open (hollow) endpoint, as on a number line. */
  function endpoint(x, y, closed, p, color) {
    const { ctx } = scene;
    ctx.save();
    ctx.globalAlpha = p;
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = color;
    ctx.fillStyle = closed ? color : config.theme.stage.background;
    ctx.beginPath();
    ctx.arc(scene.px(x), scene.py(y), 6, 0, 2 * Math.PI);
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  /** Intervals shaded along an axis: the domain on the x-axis, the range on the y-axis. */
  function band(intervals, axis, p, color) {
    const v = scene.view;
    const x0 = Math.min(Math.max(0, v.x_min), v.x_max), y0 = Math.min(Math.max(0, v.y_min), v.y_max);
    const [vmin, vmax] = axis === "x" ? [v.x_min, v.x_max] : [v.y_min, v.y_max];
    const at = (t) => (axis === "x" ? [t, y0] : [x0, t]);
    for (const [lo, hi, loClosed, hiClosed] of intervals) {
      const a = lo === null ? vmin : Math.max(lo, vmin), b = hi === null ? vmax : Math.min(hi, vmax);
      if (a > b) continue;
      scene.line(...at(a), ...at(b), p, color, { width: 9 });
      if (p >= 1) {
        if (lo !== null && lo >= vmin) endpoint(...at(lo), loClosed, 1, color);
        if (hi !== null && hi <= vmax) endpoint(...at(hi), hiClosed, 1, color);
      }
    }
  }

  function asymptotes(sol, p) {
    const v = scene.view;
    if (sol.vertical_asymptote !== null) scene.line(sol.vertical_asymptote, v.y_min, sol.vertical_asymptote, v.y_max, p, C.asymptote, { width: 2, dash: [7, 6] });
    if (sol.horizontal_asymptote !== null) scene.line(v.x_min, sol.horizontal_asymptote, v.x_max, sol.horizontal_asymptote, p, C.asymptote, { width: 2, dash: [7, 6] });
  }

  function buildTimeline(sol) {
    const show = state.show, v = sol.window;
    const tl = new Timeline(scene, {
      onFrame: (t, total) => { el.scrub.value = total ? Math.round((t / total) * 1000) : 1000; },
      onStep: highlight,
      onDone: () => setPlaying(false),
    });
    tl.speed = Number(el.speed.value);

    if (show.grid) tl.add({ id: "rule", caption: "Set up the axes", duration: 0.8, draw: (p) => scene.grid(p) });
    tl.add({ id: "rule", caption: "Set up the axes", duration: 1.0, parallel: show.grid, draw: (p) => scene.axes(p) });
    if (show.asymptotes && (sol.vertical_asymptote !== null || sol.horizontal_asymptote !== null)) {
      tl.add({ id: "rule", caption: sol.horizontal_asymptote !== null ? `Asymptotes x = ${fmt(sol.h)} and y = ${fmt(sol.k)}` : `Asymptote x = ${fmt(sol.h)}`, duration: 0.8, draw: (p) => asymptotes(sol, p) });
    }
    tl.add({ id: "rule", caption: sol.equation, duration: 1.6, rate: rate.linear, draw: (p) => {
      drawGraph(sol, p);
      if (sol.endpoint && p >= 1) scene.dot(sol.endpoint[0], sol.endpoint[1], 1, C.graph, 5);
      if (show.labels && p >= 1) scene.label(sol.equation, v.x_max, v.y_max, 1, C.graph, { dx: -10, dy: 16, align: "right", size: 14 });
    } });
    tl.add({ id: "domain", caption: `Domain ${sol.domain_text}: ${restriction(sol)}`, duration: 1.1, draw: (p) => {
      band(sol.domain, "x", p, C.domain);
      if (show.labels && p >= 1) scene.label(`domain ${sol.domain_text}`, v.x_min, Math.min(Math.max(0, v.y_min), v.y_max), 1, C.domain, { dx: 10, dy: 20, size: 13 });
    } });
    tl.add({ id: "range", caption: `Range ${sol.range_text}`, duration: 1.1, draw: (p) => {
      band(sol.range, "y", p, C.range);
      if (show.labels && p >= 1) scene.label(`range ${sol.range_text}`, Math.min(Math.max(0, v.x_min), v.x_max), v.y_max, 1, C.range, { dx: 12, dy: 14, size: 13 });
    } });
    tl.add({ id: "evaluate", caption: `The vertical line x = ${fmt(sol.x0)}`, duration: 1.0, draw: (p) => scene.line(sol.x0, v.y_max, sol.x0, v.y_min, p, C.probe, { width: 2.5, dash: [8, 6] }) });
    if (sol.hits.length) {
      tl.add({ id: "evaluate", caption: sol.family === "sideways" ? `x = ${fmt(sol.x0)}: y = ${sol.hits.map(fmt).join(" and ")}` : `f(${fmt(sol.x0)}) = ${fmt(sol.value)}`, duration: 0.9, draw: (p) => {
        for (const y of sol.hits) {
          scene.dot(sol.x0, y, p, C.hit, 6);
          if (show.labels) scene.label(point(sol.x0, y), sol.x0, y, p, C.hit, { dx: 10, dy: y === sol.hits[0] ? -14 : 14, size: 13 });
        }
      } });
    } else {
      tl.add({ id: "evaluate", caption: `x₀ = ${fmt(sol.x0)} is outside the domain: f(${fmt(sol.x0)}) is undefined`, duration: 0.9, draw: (p) => scene.flash(sol.x0, Math.min(Math.max(0, v.y_min), v.y_max), p, C.hit) });
    }
    tl.add({ id: "test", caption: testText(sol), duration: 0.9, draw: (p) => { for (const y of sol.hits) if (sol.hits.length > 1) scene.flash(sol.x0, y, p, C.hit); } });
    return tl;
  }

  // ---- Controls ----------------------------------------------------------------
  function setPlaying(playing) { el.play.textContent = playing ? "❚❚ Pause" : "▶ Play"; }
  function syncInputs() {
    for (const key of KEYS) { $(`${key}-num`).value = state[key]; $(`${key}-range`).value = state[key]; }
    el.family.value = state.family;
    el.about.textContent = ABOUT[state.family];
  }

  function frame(sol, { refit = false } = {}) {
    const points = [[sol.h, sol.k], ...sol.hits.filter((y) => Math.abs(y) <= 50).map((y) => [sol.x0, y])];
    const target = refit ? view.roomy(sol.window) : view.follow(scene.targetView, sol.window, points);
    if (!target) return;
    scene.moveTo(target, { onFrame: () => { if (timeline && !timeline.playing) timeline.render(); } });
  }

  function update({ fromConfig = false, refit = false } = {}) {
    if (timeline) timeline.stop();
    setPlaying(false);
    let sol;
    try {
      if (KEYS.some((k) => !Number.isFinite(state[k]))) throw new Error("Enter a number for a, h, k and x₀.");
      sol = fromConfig ? config.solution : solve(...KEYS.map((k) => state[k]), state.family);
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
    PPParams.write({ ...Object.fromEntries(KEYS.map((k) => [k, state[k]])), family: state.family });
  }

  function readHash() {
    const values = PPParams.read(KEYS);
    const family = new URLSearchParams(location.hash.slice(1)).get("family");
    Object.assign(state, values);
    const known = FAMILIES.includes(family);
    if (known) state.family = family;
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
  el.family.addEventListener("change", () => {
    state.family = el.family.value;
    el.about.textContent = ABOUT[state.family];
    update({ refit: true });
  });
  document.querySelectorAll("[data-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      const parts = button.dataset.preset.split(",");
      KEYS.forEach((key, i) => { state[key] = Number(parts[i]); });
      state.family = parts[4];
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
