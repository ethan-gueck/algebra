/*
 * quadratic_geometry.js: the geometric animation, completing the square with areas.
 *
 * ax² + bx + c = 0 is divided by a, so it reads x² + Bx + C = 0 (B = b/a, C = c/a). Then:
 * x² is a square of side x, Bx a rectangle x by |B| (added to the right when B > 0, cut out of the
 * square when B < 0). The rectangle is split into two strips of width d = |B|/2 and one is turned
 * to lie along the bottom. That leaves a d-by-d corner (missing when adding, cut twice when
 * subtracting): the square that completes it, added and taken away again, outlined dotted.
 * So x² + Bx = (x + B/2)² − d², and with the constant (x + B/2)² = d² − C = Δ / 4a². The last
 * square has that area; when Δ < 0 no real square does, and it is drawn dotted as an imaginary one.
 *
 * x itself is unknown, so the square is drawn at a display length X; only B, C and d are to scale.
 * Exposes window.QuadGeometry = { build, fit }.
 */
(function (global) {
  "use strict";
  const { rate, niceStep } = global.Manim;
  const { fmt, complex } = global.QuadForms;

  const DOTS = [3, 6];
  const lerp = (a, b, t) => a + (b - a) * t;
  const clean = (v) => { const r = Number(v.toFixed(10)); return r === 0 ? 0 : r; };
  const signed = (v) => `${clean(v) < 0 ? "−" : "+"} ${fmt(Math.abs(v))}`;
  const times = (v) => (clean(v - 1) ? `${fmt(v)}x` : "x");  // v·x, with 1·x as x
  const monic = (B, C) => `x²${clean(B) ? ` ${clean(B) < 0 ? "−" : "+"} ${times(Math.abs(B))}` : ""}${clean(C) ? ` ${signed(C)}` : ""}`;
  const shifted = (B) => (clean(B) ? `(x ${signed(B / 2)})` : "x");

  /** A rectangle in math coordinates, given by its centre, size and turn (radians). */
  function shape(scene, { cx, cy, w, h, angle = 0 }, color, { fill = 0.22, stroke = 2, dash = null, alpha = 1 } = {}) {
    if (alpha <= 0 || w <= 0 || h <= 0) return;
    const { ctx } = scene;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const corners = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]
      .map(([x, y]) => [scene.px(cx + x * cos - y * sin), scene.py(cy + x * sin + y * cos)]);
    ctx.save();
    ctx.beginPath();
    corners.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    if (fill) { ctx.globalAlpha = alpha * fill; ctx.fillStyle = color; ctx.fill(); }
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = stroke;
    ctx.lineJoin = "round";
    if (dash) ctx.setLineDash(dash);
    ctx.stroke();
    ctx.restore();
  }
  /** The same, from corners [x0, x1] × [y0, y1]. */
  const box = (x0, x1, y0, y1) => ({ cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 });

  /**
   * Add the geometric steps for `sol` (a QuadForms.solve result, or the a = 0 line) to timeline `tl`.
   * Returns the figure's bounds { x0, x1, y0, y1 } for fit().
   */
  function build(tl, scene, sol, { show, C }) {
    const label = (text, x, y, p, color, opts = {}) => scene.label(text, x, y, p, color, { dx: 0, dy: 0, align: "center", ...opts });
    if (sol.linear) {
      tl.add({ id: "curve", caption: `a = 0: there is no x² term, so no square to complete. ${sol.equation} is a line.`, duration: 1,
        draw: (p) => label("a = 0: no x² square to complete", 0, 1, p, C.discriminant, { size: 17 }) });
      return { x0: -3, x1: 3, y0: -1.5, y1: 1.2 };  // the note sits above the Run button
    }

    const { a, b, c } = sol.standard;
    const { h, k } = sol.vertex;
    const B = b / a, C0 = c / a, d = Math.abs(B) / 2, d2 = d * d;
    const R = clean(d2 - C0);                  // (x + B/2)² = R = Δ / 4a²
    const up = B >= 0;                         // add the strips outside, or cut them from the square
    const X = Math.max(3, 3 * d);              // the square's display side (x is unknown)
    const strips = clean(B) !== 0;

    // Where everything sits. The square is [0, X] × [0, X].
    const stripA = up ? box(X, X + d, 0, X) : box(X - d, X, 0, X);
    const whole = up ? box(X, X + 2 * d, 0, X) : box(X - 2 * d, X, 0, X);
    const fromB = up ? box(X + d, X + 2 * d, 0, X) : box(X - 2 * d, X - d, 0, X);
    const toB = { cx: X / 2, cy: up ? -d / 2 : d / 2, w: d, h: X, angle: -Math.PI / 2 };
    const corner = up ? box(X, X + d, -d, 0) : box(X - d, X, 0, d);
    const done = up ? box(0, X + d, -d, X) : box(0, X - d, d, X);
    const bottom = up ? -d : 0;
    const right = up ? X + d : X;
    const gap = 0.18 * X;
    const tc = Math.sqrt(Math.abs(C0));
    const tile = box(right + gap, right + gap + tc, bottom, bottom + tc);
    const tf = Math.sqrt(Math.abs(R));
    const fx = clean(C0) ? tile.cx + tc / 2 + gap : right + gap;
    const final = box(fx, fx + tf, bottom, bottom + tf);

    // Each step records how far along it is; one painter draws the figure from that, so a strip
    // can be drawn whole, then split, then turned, without earlier steps drawing over it.
    let at = {};
    const phase = (name, meta) => tl.add({ ...meta, draw: (p) => { at[name] = p; } });
    const sq = `${fmt(d)}`;

    phase("intro", { id: "parent", duration: 0.6, rate: rate.linear,
      caption: clean(a - 1) ? `Divide by a = ${fmt(a)}: ${monic(B, C0)} = 0` : `Start from ${monic(B, C0)} = 0` });
    phase("square", { id: "parent", duration: 1.0, caption: "x² is a square with side x (drawn at any length: x is what we are solving for)" });
    if (strips) {
      phase("strip", { id: "shift", duration: 1.0, caption: up
        ? `${times(B)} is a rectangle, x by ${fmt(B)}, added to the side`
        : `−${times(-B)}: cut an x-by-${fmt(-B)} strip off the square` });
      phase("split", { id: "shift", duration: 0.8, caption: `Split it in half: two x-by-${sq} strips (${sq} = |b / 2a|)` });
      phase("move", { id: "shift", duration: 1.4, wait: 0.2, caption: up
        ? "Turn one half and fit it along the bottom: an L shape around the square"
        : "Turn one half and cut it along the bottom instead" });
      phase("corner", { id: "stretch", duration: 1.0, wait: 0.3, caption: up
        ? `A ${sq}-by-${sq} corner is missing. Add it, and take it away again: ${sq}² = ${fmt(d2)}`
        : `The corner was cut away twice. Put one back, and take it away outside: ${sq}² = ${fmt(d2)}` });
      phase("done", { id: "stretch", duration: 1.0, caption: `${monic(B, 0)} = ${shifted(B)}² − ${fmt(d2)}` });
    } else {
      phase("done", { id: "stretch", duration: 0.8, caption: "b = 0: x² is already a perfect square" });
    }
    if (clean(C0)) phase("tile", { id: "lift", duration: 0.9, caption: `The constant c / a = ${fmt(C0)}${C0 < 0 ? " is taken away" : ""}: ${shifted(B)}² − ${fmt(d2)} ${signed(C0)} = 0` });
    phase("vertex", { id: "vertex", duration: 1.2, rate: rate.linear,
      caption: `Multiply back by a: y = a(x − h)² + k with h = ${fmt(h)}, k = a(c/a − ${fmt(d2)}) = ${fmt(k)}, so ${sol.equation}` });
    const [r1, r2] = sol.quadratic.roots;
    const roots = R > 0 ? `x = ${fmt(h)} ± ${fmt(tf)} = ${complex(r1)}, ${complex(r2)}`
      : R === 0 ? `x = ${fmt(h)} (repeated)` : `x = ${complex(r1)}, ${complex(r2)}`;
    phase("final", { id: "roots", duration: 1.2, caption: R > 0
      ? `So ${shifted(B)}² = ${fmt(d2)} − ${fmt(C0)} = ${fmt(R)}, a square of side ${fmt(tf)}: ${roots}`
      : R === 0 ? `So ${shifted(B)}² = 0: the square has no size, ${roots}`
      : `So ${shifted(B)}² = ${fmt(R)}. No real square has a negative area: the dotted one is imaginary, side √(${fmt(R)}) = ${fmt(tf)}i, so ${roots}` });

    const paint = () => {
      const g = (name) => at[name] || 0;
      const labels = show.labels;
      const sP = g("square"), stripP = g("strip"), splitP = g("split"), moveP = g("move"), cornerP = g("corner"), doneP = g("done");
      // x²: grows from its bottom-left corner.
      if (sP) {
        shape(scene, box(0, X * sP, 0, X * sP), C.curve, { fill: 0.16 });
        const centre = up ? [X / 2, X / 2] : [(X - d) / 2, (X + d) / 2];  // clear of the cut strips
        label("x²", centre[0], centre[1], sP * (1 - doneP), C.curve, { size: 18 });  // gives way to (x ± d)²
        if (labels) {
          label("x", X / 2, X, sP, C.curve, { dy: -14 });
          label("x", 0, X / 2, sP * (1 - doneP), C.curve, { dx: -14 });
        }
      }
      if (strips && stripP) {
        const color = up ? C.y_intercept : C.discriminant;
        if (!splitP) {
          // The whole Bx rectangle, growing out from (or into) the square's right edge.
          const w = whole.w * stripP;
          shape(scene, up ? box(X, X + w, 0, X) : box(X - w, X, 0, X), color);
          label(`${up ? "" : "−"}${times(Math.abs(B))}`, whole.cx, whole.cy, stripP, color);
          if (labels) label(fmt(Math.abs(B)), whole.cx, X, stripP, color, { dy: -14 });
        } else {
          const turn = {
            cx: lerp(fromB.cx, toB.cx, moveP), cy: lerp(fromB.cy, toB.cy, moveP),
            w: d, h: X, angle: lerp(0, toB.angle, moveP),
          };
          shape(scene, stripA, color);
          shape(scene, turn, color);
          label(`${up ? "" : "−"}${times(d)}`, stripA.cx, stripA.cy, splitP, color);
          label(`${up ? "" : "−"}${times(d)}`, turn.cx, turn.cy, splitP, color);
          if (labels) {
            label(sq, stripA.cx, X, splitP, color, { dy: -14 });
            if (moveP < 1) label(sq, fromB.cx, X, splitP * (1 - moveP), color, { dy: -14 });
            if (moveP) label(sq, 0, toB.cy, moveP, color, { dx: -16 });
          }
        }
      }
      // The square that completes it: added and taken away again, so it is only imagined. Dotted.
      if (strips && cornerP) {
        shape(scene, corner, C.roots, { fill: 0.1 * cornerP, stroke: 2, dash: DOTS, alpha: cornerP });
        label(`+${fmt(d2)}`, corner.cx, corner.cy, cornerP, C.roots, { size: 13 });
        if (labels) label(`${up ? "add and remove" : "cut twice: put back"} ${sq}²`, corner.cx, corner.cy - corner.h / 2, cornerP, C.roots, { dy: 16, size: 13 });
      }
      if (doneP) {
        shape(scene, done, C.vertex, { fill: 0, stroke: 3, alpha: doneP });
        label(`${shifted(B)}²`, done.cx, done.cy, doneP, C.vertex, { size: 17 });
        if (labels && strips) label(`x ${signed(B / 2)}`, done.cx - done.w / 2, done.cy, doneP, C.vertex, { dx: -18, align: "right" });
      }
      const tileP = g("tile");
      if (tileP) {
        shape(scene, tile, C.symmetry, C0 < 0 ? { fill: 0.08, alpha: tileP } : { fill: 0.3, alpha: tileP });
        label(`${C0 < 0 ? "−" : "+"}${fmt(Math.abs(C0))}`, tile.cx, tile.cy, tileP, C.symmetry, { size: 13 });
        if (labels) label("c / a", tile.cx, tile.cy + tc / 2, tileP, C.symmetry, { dy: -14, size: 13 });
      }
      const finalP = g("final");
      if (finalP) {
        const grown = box(final.cx - (tf * finalP) / 2, final.cx + (tf * finalP) / 2, bottom, bottom + tf * finalP);
        if (R === 0) scene.dot(final.cx, bottom, finalP, C.roots);
        else shape(scene, grown, C.roots, R > 0 ? { fill: 0.25 } : { fill: 0.06, stroke: 2.5, dash: DOTS });
        const area = R < 0 ? `area ${fmt(R)}: imaginary` : `area ${fmt(R)}`;
        label(area, final.cx, bottom + tf, finalP, C.roots, { dy: -16, size: 13 });
        if (labels && R) label(R > 0 ? `side ${fmt(tf)}` : `side ${fmt(tf)}i`, final.cx, bottom, finalP, C.roots, { dy: 16, size: 13 });
      }
      at = {};
    };
    // The painter runs last on every frame (after every step that has started) and from time 0.
    tl.steps.push({ draw: paint, duration: 0, start: 0, end: 0, rate: rate.linear });

    const x1 = Math.max(right, clean(C0) ? tile.cx + tc / 2 : right, final.cx + tf / 2);
    const y1 = Math.max(X, bottom + tc, bottom + tf);
    return { x0: -0.08 * X, x1, y0: bottom - 0.12 * X, y1: y1 + 0.08 * X };
  }

  /** A view around `bounds` with one unit the same length across and up, so squares stay square. */
  function fit(scene, { x0, x1, y0, y1 }, pad = 0.14) {
    const w = scene.width - 2 * scene.margin, hgt = scene.height - 2 * scene.margin;
    const unit = Math.max(((x1 - x0) * (1 + 2 * pad)) / w, ((y1 - y0) * (1 + 2 * pad)) / hgt);
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const v = { x_min: cx - (unit * w) / 2, x_max: cx + (unit * w) / 2, y_min: cy - (unit * hgt) / 2, y_max: cy + (unit * hgt) / 2 };
    v.x_step = niceStep(v.x_max - v.x_min);
    v.y_step = niceStep(v.y_max - v.y_min);
    return v;
  }

  global.QuadGeometry = { build, fit };
})(window);
