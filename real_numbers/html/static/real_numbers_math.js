/*
 * real_numbers_math.js — browser mirror of real_numbers/solver.py (A1.1, A1.2, A1.14).
 *
 * Exact real numbers are BigInt fractions (Python: fractions.Fraction);
 * floating point is plain Number (IEEE 754 doubles, like Python's float).
 * tests/test_js_parity.py checks every function against the Python output.
 * Exposes window.RealMath (browser) or module.exports (Node).
 */
(function (global) {
  "use strict";

  const MINUS = "−";
  const OPS = { "+": "+", "-": MINUS, "*": "×", "/": "÷", "^": "^" };
  const MAX_EXPONENT = 64;
  const MAX_DIGITS = 400;

  // ---- Exact numbers: BigInt fractions --------------------------------------
  const babs = (n) => (n < 0n ? -n : n);
  const gcd = (a, b) => { a = babs(a); b = babs(b); while (b) [a, b] = [b, a % b]; return a; };

  function frac(n, d = 1n) {
    if (d === 0n) throw new Error("Division by zero is undefined.");
    if (d < 0n) { n = -n; d = -d; }
    const g = gcd(n, d) || 1n;
    return { n: n / g, d: d / g };
  }
  const add = (a, b) => frac(a.n * b.d + b.n * a.d, a.d * b.d);
  const sub = (a, b) => frac(a.n * b.d - b.n * a.d, a.d * b.d);
  const mul = (a, b) => frac(a.n * b.n, a.d * b.d);
  const div = (a, b) => frac(a.n * b.d, a.d * b.n);
  const neg = (a) => frac(-a.n, a.d);
  const eq = (a, b) => a.n === b.n && a.d === b.d;
  const toNumber = (a) => Number(a.n) / Number(a.d);
  function powInt(a, k) {
    let result = frac(1n);
    for (let i = 0; i < Math.abs(k); i++) result = mul(result, a);
    return k < 0 ? div(frac(1n), result) : result;
  }

  /** Exact value of a decimal string like "0.1", "-2.5e-3" (no float in between). */
  function decimal(s) {
    const [mantissa, exp = "0"] = s.toLowerCase().split("e");
    const sign = mantissa.startsWith("-") ? -1n : 1n;
    const digits = mantissa.replace(/^[+-]/, "");
    const [whole, fracPart = ""] = digits.split(".");
    let n = BigInt((whole || "0") + fracPart) * sign;
    let d = 10n ** BigInt(fracPart.length);
    const e = Number(exp);
    if (e > 0) n *= 10n ** BigInt(e); else if (e < 0) d *= 10n ** BigInt(-e);
    return frac(n, d);
  }

  function parseNumber(text) {
    const s = text.trim().replaceAll(MINUS, "-");
    if (/^[+-]?\d+\/\d+$/.test(s)) {
      const [num, den] = s.split("/");
      if (BigInt(den) === 0n) throw new Error("A fraction can't have a zero denominator.");
      return frac(BigInt(num.replace("+", "")), BigInt(den));
    }
    if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s)) throw new Error(`'${text.trim()}' isn't a number. Try 0.1, -3 or 2/3.`);
    return decimal(s);
  }

  /** The double a computer stores for `text`: correctly rounded, like Python's float(Fraction(text)). */
  function toFloat(text) {
    const s = text.trim().replaceAll(MINUS, "-");
    return /\//.test(s) ? toNumber(parseNumber(s)) : Number(s);
  }

  function exactText(v) {
    let den = v.d, twos = 0, fives = 0;
    while (den % 2n === 0n) { den /= 2n; twos++; }
    while (den % 5n === 0n) { den /= 5n; fives++; }
    const sign = v.n < 0n ? MINUS : "";
    if (den !== 1n) return `${sign}${babs(v.n)}/${v.d}`;
    const places = Math.max(twos, fives);
    const scaled = (babs(v.n) * 10n ** BigInt(places)) / v.d;
    if (!places) return sign + String(scaled);
    const p = 10n ** BigInt(places);
    const fracText = ("." + String(scaled % p).padStart(places, "0")).replace(/0+$/, "").replace(/\.$/, "");
    return sign + String(scaled / p) + fracText;
  }

  const show = (v) => (v.n < 0n ? `(${exactText(v)})` : exactText(v));

  // ---- Properties -------------------------------------------------------------
  const PROPERTIES = [
    ["commutative_add", "Commutative (addition)", "a + b = b + a"],
    ["commutative_mul", "Commutative (multiplication)", "a × b = b × a"],
    ["associative_add", "Associative (addition)", "(a + b) + c = a + (b + c)"],
    ["associative_mul", "Associative (multiplication)", "(a × b) × c = a × (b × c)"],
    ["distributive", "Distributive", "a × (b + c) = a × b + a × c"],
    ["identity_add", "Additive identity", "a + 0 = a"],
    ["identity_mul", "Multiplicative identity", "a × 1 = a"],
    ["inverse_add", "Additive inverse", "a + (−a) = 0"],
    ["inverse_mul", "Multiplicative inverse", "a × (1 ÷ a) = 1"],
  ];

  function properties(a, b, c) {
    const [A, B, C] = [a, b, c].map(parseNumber);
    const [fa, fb, fc] = [a, b, c].map(toFloat);
    const [sa, sb, sc] = [A, B, C].map(show);
    const zero = frac(0n), one = frac(1n);
    const rows = {
      commutative_add: [`${sa} + ${sb}`, `${sb} + ${sa}`, add(A, B), add(B, A), fa + fb, fb + fa],
      commutative_mul: [`${sa} × ${sb}`, `${sb} × ${sa}`, mul(A, B), mul(B, A), fa * fb, fb * fa],
      associative_add: [`(${sa} + ${sb}) + ${sc}`, `${sa} + (${sb} + ${sc})`, add(add(A, B), C), add(A, add(B, C)), (fa + fb) + fc, fa + (fb + fc)],
      associative_mul: [`(${sa} × ${sb}) × ${sc}`, `${sa} × (${sb} × ${sc})`, mul(mul(A, B), C), mul(A, mul(B, C)), (fa * fb) * fc, fa * (fb * fc)],
      distributive: [`${sa} × (${sb} + ${sc})`, `${sa} × ${sb} + ${sa} × ${sc}`, mul(A, add(B, C)), add(mul(A, B), mul(A, C)), fa * (fb + fc), fa * fb + fa * fc],
      identity_add: [`${sa} + 0`, sa, add(A, zero), A, fa + 0, fa],
      identity_mul: [`${sa} × 1`, sa, mul(A, one), A, fa * 1, fa],
      inverse_add: [`${sa} + ${show(neg(A))}`, "0", add(A, neg(A)), zero, fa + -fa, 0],
    };
    return PROPERTIES.map(([id, name, rule]) => {
      let row = rows[id];
      if (id === "inverse_mul") {
        if (A.n === 0n) return { id, name, rule, applies: false };
        row = [`${sa} × (1 ÷ ${sa})`, "1", mul(A, div(one, A)), one, fa * (1 / fa), 1];
      }
      const [left, right, el, er, fl, fr] = row;
      return {
        id, name, rule, applies: true, left, right,
        exact: [exactText(el), exactText(er)], exact_holds: eq(el, er),
        exact_float: [toNumber(el), toNumber(er)],
        float: [fl, fr], float_holds: fl === fr,
      };
    });
  }

  // ---- Order of operations ----------------------------------------------------
  const NORMAL = { "×": "*", "·": "*", "÷": "/", "−": "-", "**": "^" };

  function tokenize(expr) {
    const tokens = [];
    const re = /\s*(?:(\d+\.?\d*|\.\d+)|(\*\*|[-+*/^()×÷·−]))/y;
    const text = expr.trimEnd();
    let pos = 0;
    while (pos < text.length) {
      re.lastIndex = pos;
      const m = re.exec(text);
      if (!m) throw new Error(`Unexpected '${text.slice(pos).trim()[0]}'. Use numbers, + − × ÷ ^ and parentheses.`);
      tokens.push(m[1] || NORMAL[m[2]] || m[2]);
      pos = re.lastIndex;
    }
    if (!tokens.length) throw new Error("Enter an expression, e.g. 3 + 4 × 2.");
    return tokens;
  }

  const num = (value, fvalue) => ({ kind: "num", value, fvalue });

  function parse(tokens) {
    let i = 0;
    const peek = () => tokens[i];
    const take = () => { if (i >= tokens.length) throw new Error("The expression ends too soon."); return tokens[i++]; };
    function expr() {
      let node = term();
      while (peek() === "+" || peek() === "-") node = { kind: "bin", op: take(), left: node, right: term(), paren: false };
      return node;
    }
    function term() {
      let node = unary();
      while (peek() === "*" || peek() === "/" || peek() === "(") {
        const op = peek() === "(" ? "*" : take();  // 2(3 + 4) means 2 × (3 + 4)
        node = { kind: "bin", op, left: node, right: unary(), paren: false };
      }
      return node;
    }
    function unary() {
      if (peek() === "-") {
        take();
        const child = unary();
        if (child.kind === "num") return num(neg(child.value), -child.fvalue);  // −3 is just a negative number
        return { kind: "neg", child, paren: false };
      }
      if (peek() === "+") { take(); return unary(); }
      return power();
    }
    function power() {
      const base = atom();
      if (peek() === "^") { take(); return { kind: "bin", op: "^", left: base, right: unary(), paren: false }; }
      return base;
    }
    function atom() {
      const token = take();
      if (token === "(") {
        const node = expr();
        if (take() !== ")") throw new Error("A '(' is missing its ')'.");
        if (node.kind !== "num") node.paren = true;
        return node;
      }
      if (/^[\d.]/.test(token)) return num(decimal(token), Number(token));
      throw new Error(`Unexpected '${token}'.`);
    }
    const root = expr();
    if (i < tokens.length) throw new Error(`Unexpected '${peek()}'.`);
    return root;
  }

  function render(node, top = true) {
    if (node.kind === "num") return top ? exactText(node.value) : show(node.value);
    let text;
    if (node.kind === "neg") text = MINUS + render(node.child, false);
    else {
      const sep = node.op === "^" ? "" : " ";
      text = `${render(node.left, false)}${sep}${OPS[node.op]}${sep}${render(node.right, false)}`;
    }
    return node.paren ? `(${text})` : text;
  }

  /** base ** n by repeated multiplication, so Python and JavaScript round identically. */
  function fpow(base, n) {
    let result = 1;
    for (let k = 0; k < Math.abs(n); k++) result *= base;
    return n < 0 ? 1 / result : result;
  }

  const RANK = { "^": 4, neg: 3, "*": 2, "/": 2, "+": 1, "-": 1 };
  const RULE = { "^": "Exponent", neg: "Negation", "*": "Multiplication", "/": "Division", "+": "Addition", "-": "Subtraction" };

  function apply(node) {
    let value, fvalue, work;
    if (node.kind === "neg") {
      value = neg(node.child.value); fvalue = -node.child.fvalue;
      work = `${MINUS}(${exactText(node.child.value)})`;
    } else {
      const a = node.left, b = node.right;
      if (node.op === "+") { value = add(a.value, b.value); fvalue = a.fvalue + b.fvalue; }
      else if (node.op === "-") { value = sub(a.value, b.value); fvalue = a.fvalue - b.fvalue; }
      else if (node.op === "*") { value = mul(a.value, b.value); fvalue = a.fvalue * b.fvalue; }
      else if (node.op === "/") {
        if (b.value.n === 0n) throw new Error("Division by zero is undefined.");
        value = div(a.value, b.value); fvalue = a.fvalue / b.fvalue;
      } else {
        if (b.value.d !== 1n || babs(b.value.n) > BigInt(MAX_EXPONENT)) throw new Error(`Exponents here must be whole numbers from −${MAX_EXPONENT} to ${MAX_EXPONENT}.`);
        if (a.value.n === 0n && b.value.n < 0n) throw new Error("0 to a negative power divides by zero, so it is undefined.");
        value = powInt(a.value, Number(b.value.n)); fvalue = fpow(a.fvalue, Number(b.value.n));
      }
      const sep = node.op === "^" ? "" : " ";
      work = `${show(a.value)}${sep}${OPS[node.op]}${sep}${show(b.value)}`;
    }
    if (String(babs(value.n)).length + String(value.d).length > MAX_DIGITS) throw new Error("The numbers get too large to show exactly.");
    return [num(value, fvalue), `${work} = ${exactText(value)}`];
  }

  function walk(node, parent, side, depth, found, order) {
    if (node.kind === "num") return found;
    depth += node.paren ? 1 : 0;
    const position = order[0]++;
    if (node.kind === "neg") {
      walk(node.child, node, "child", depth, found, order);
      if (node.child.kind === "num") found.push([depth, RANK.neg, position, node, parent, side]);
    } else {
      walk(node.left, node, "left", depth, found, order);
      walk(node.right, node, "right", depth, found, order);
      if (node.left.kind === "num" && node.right.kind === "num") found.push([depth, RANK[node.op], position, node, parent, side]);
    }
    return found;
  }

  function orderOfOperations(expr) {
    let root = parse(tokenize(expr));
    const start = render(root);
    const steps = [];
    while (root.kind !== "num") {
      const candidates = walk(root, null, null, 0, [], [0]);
      candidates.sort((x, y) => (y[0] - x[0]) || (y[1] - x[1]) || (x[2] - y[2]));
      const [depth, , , node, parent, side] = candidates[0];
      const [number, work] = apply(node);
      if (parent === null) root = number; else parent[side] = number;
      steps.push({ rule: RULE[node.kind === "neg" ? "neg" : node.op], parentheses: depth > 0, work, expression: render(root) });
    }
    return { start, steps, result: exactText(root.value), value: root.fvalue };
  }

  // ---- When grouping changes the answer --------------------------------------
  const degrees = (rad) => rad * (180 / Math.PI);
  const altitudeDeg = (sine) => (sine >= -1 && sine <= 1 ? degrees(Math.asin(sine)) : null);

  function guardedAltitudeDeg(sine, tolerance = 1e-12) {
    if (Math.abs(sine) <= tolerance) sine = 0;
    else if (Math.abs(Math.abs(sine) - 1) <= tolerance) sine = Math.sign(sine);
    return degrees(Math.asin(Math.max(-1, Math.min(1, sine))));
  }

  function sumTwoWays(a, b, c) {
    const [A, B, C] = [a, b, c].map(parseNumber);
    const [fa, fb, fc] = [a, b, c].map(toFloat);
    const exact = add(add(A, B), C);
    const left = (fa + fb) + fc, right = fa + (fb + fc);
    return {
      exact: exactText(exact),
      exact_value: toNumber(exact),
      left, right, same: left === right,
      altitude: { exact: altitudeDeg(toNumber(exact)), left: altitudeDeg(left), right: altitudeDeg(right) },
      guarded: { left: guardedAltitudeDeg(left), right: guardedAltitudeDeg(right) },
    };
  }

  // ---- Exponent rules (A1.2) -------------------------------------------------
  const MAX_POWER = 20;
  const MAX_POWER_BITS = 1000;  // numerator + denominator bits: keeps every power inside a double's range (2^±1023)
  const EXPONENT_RULES = [
    ["product", "Product rule", "aᵐ × aⁿ = aᵐ⁺ⁿ"],
    ["quotient", "Quotient rule", "aᵐ ÷ aⁿ = aᵐ⁻ⁿ"],
    ["power", "Power of a power", "(aⁿ)ᵐ = aᵐⁿ"],
    ["zero", "Zero exponent", "a⁰ = 1"],
    ["negative", "Negative exponent", "a⁻ᵐ = 1 ÷ aᵐ"],
  ];

  function parseExponent(text, name) {
    const s = text.trim().replaceAll(MINUS, "-");
    if (!/^[+-]?\d+$/.test(s) || Math.abs(Number(s)) > MAX_POWER) throw new Error(`${name} must be a whole number from −${MAX_POWER} to ${MAX_POWER}.`);
    return Number(s);
  }
  const intText = (k) => (k < 0 ? `${MINUS}${-k}` : String(k));
  const powText = (base, k) => (k < 0 ? `${base}^(${intText(k)})` : `${base}^${k}`);

  function exponentRules(a, m, n) {
    const A = parseNumber(a);
    const M = parseExponent(m, "m"), N = parseExponent(n, "n");
    const biggest = Math.max(Math.abs(M), Math.abs(N), Math.abs(M + N), Math.abs(M - N), Math.abs(M * N));
    if (A.n !== 0n) {
      const big = powInt(A, biggest);
      if (babs(big.n).toString(2).length + big.d.toString(2).length > MAX_POWER_BITS) throw new Error("Those powers get too large to compare in floating point. Try a smaller base or exponents.");
    }
    const fa = toFloat(a), sa = show(A), one = frac(1n);
    // rule id -> [exponents that must be positive when a = 0, the two sides as text, exact sides, float sides]
    const rows = {
      product: [[M, N], `${powText(sa, M)} × ${powText(sa, N)}`, powText(sa, M + N),
        () => [mul(powInt(A, M), powInt(A, N)), powInt(A, M + N)], () => [fpow(fa, M) * fpow(fa, N), fpow(fa, M + N)]],
      quotient: [[M, N, 0], `${powText(sa, M)} ÷ ${powText(sa, N)}`, powText(sa, M - N),
        () => [div(powInt(A, M), powInt(A, N)), powInt(A, M - N)], () => [fpow(fa, M) / fpow(fa, N), fpow(fa, M - N)]],
      power: [[M, N], powText(`(${powText(sa, N)})`, M), powText(sa, M * N),
        () => [powInt(powInt(A, N), M), powInt(A, M * N)], () => [fpow(fpow(fa, N), M), fpow(fa, M * N)]],
      zero: [[0], powText(sa, 0), "1", () => [powInt(A, 0), one], () => [fpow(fa, 0), 1]],
      negative: [[M, -M, 0], powText(sa, -M), `1 ÷ ${powText(sa, M)}`,
        () => [powInt(A, -M), div(one, powInt(A, M))], () => [fpow(fa, -M), 1 / fpow(fa, M)]],
    };
    return EXPONENT_RULES.map(([id, name, rule]) => {
      const [positive, left, right, exactSides, floatSides] = rows[id];
      if (A.n === 0n && Math.min(...positive) <= 0) {
        const note = id === "zero" ? "Needs a ≠ 0: 0⁰ is undefined." : "Needs a ≠ 0 here: 0 to a zero or negative power is undefined.";
        return { id, name, rule, applies: false, note };
      }
      const [el, er] = exactSides();
      const [fl, fr] = floatSides();
      return {
        id, name, rule, applies: true, left, right,
        exact: [exactText(el), exactText(er)], exact_holds: eq(el, er),
        exact_float: [toNumber(el), toNumber(er)],
        float: [fl, fr], float_holds: fl === fr,
      };
    });
  }

  // ---- Ratios, proportions and percent change (A1.14) -------------------------
  const ratioText = (x, y) => `${exactText(x)} : ${exactText(y)}`;
  function simplestRatio(x, y) {
    const q = div(x, y);
    return `${q.n < 0n ? MINUS + String(-q.n) : String(q.n)} : ${q.d}`;
  }

  function proportion(a, b, c, d) {
    const [A, B, C, D] = [a, b, c, d].map(parseNumber);
    if (B.n === 0n || D.n === 0n) throw new Error("The second term of a ratio can't be 0: a ÷ 0 is undefined.");
    const [fa, fb, fc, fd] = [a, b, c, d].map(toFloat);
    return {
      left: ratioText(A, B), right: ratioText(C, D),
      simplest: [simplestRatio(A, B), simplestRatio(C, D)],
      exact: [exactText(div(A, B)), exactText(div(C, D))], exact_holds: eq(div(A, B), div(C, D)),
      cross: [exactText(mul(A, D)), exactText(mul(B, C))],
      float: [fa / fb, fc / fd], float_holds: fa / fb === fc / fd,
    };
  }

  const percent = (o, n) => mul(div(sub(n, o), o), frac(100n));
  function percentChange(original, next) {
    const O = parseNumber(original), N = parseNumber(next);
    if (O.n === 0n) throw new Error("The original value can't be 0: percent change divides by it.");
    const fo = toFloat(original), fn = toFloat(next);
    const exact = percent(O, N);
    const undo = N.n !== 0n ? percent(N, O) : null;
    return {
      exact: exactText(exact), exact_value: toNumber(exact),
      float: (fn - fo) / fo * 100,
      direction: exact.n > 0n ? "increase" : exact.n < 0n ? "decrease" : "no change",
      undo: undo === null ? null : exactText(undo),
      undo_value: undo === null ? null : toNumber(undo),
    };
  }

  const api = {
    properties, order_of_operations: orderOfOperations, sum_two_ways: sumTwoWays,
    exponent_rules: exponentRules, proportion, percent_change: percentChange,
    exact_text: (text) => exactText(parseNumber(text)), to_float: toFloat,
    altitude_deg: altitudeDeg, guarded_altitude_deg: guardedAltitudeDeg,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else global.RealMath = api;
})(typeof window !== "undefined" ? window : globalThis);
