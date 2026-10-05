"""Properties of real numbers, order of operations, exponent rules, ratios and
percent change, and where floating point breaks them.

formula.py holds the mathematics as written: each property as a function of
a, b, c returning its two sides, the PEMDAS ranking, each exponent rule and the
proportion as a check that two sides are equal, and percent change. This module
runs those functions on exact numbers and on floats, steps through expressions,
and formats everything for the page.

Real numbers here are exact rationals (fractions.Fraction): "0.1" is exactly
one tenth. Floating point is IEEE 754 double precision, what Python's float
and JavaScript's Number use, where 0.1 is the nearest double to one tenth.
Comparing the two shows which properties survive on a computer.

The page's JavaScript mirror (html/static/real_numbers_math.js) uses BigInt
fractions for the exact side and is kept identical by tests/test_js_parity.py.
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass
from fractions import Fraction

from core import formula

MINUS = "−"
OPS = {"+": "+", "-": MINUS, "*": "×", "/": "÷", "^": "^"}
MAX_EXPONENT = 64
MAX_DIGITS = 400


# ---- Exact numbers ----------------------------------------------------------

def parse_number(text: str) -> Fraction:
    """'0.1' -> 1/10, '-3' -> -3, '2/3' -> 2/3. Decimals are read exactly, not via float."""
    s = text.strip().replace(MINUS, "-")
    if re.fullmatch(r"[+-]?\d+/\d+", s):
        num, den = s.split("/")
        if int(den) == 0:
            raise ValueError("A fraction can't have a zero denominator.")
        return Fraction(int(num), int(den))
    if not re.fullmatch(r"[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?", s, re.I):
        raise ValueError(f"'{text.strip()}' isn't a number. Try 0.1, -3 or 2/3.")
    return Fraction(s)


def to_float(text: str) -> float:
    """The double a computer stores for ``text`` (the nearest one to its exact value)."""
    return float(parse_number(text))


def exact_text(value: Fraction) -> str:
    """Exact value as text: a terminating decimal when there is one ('0.6', '-2.5'), else 'p/q'."""
    den = value.denominator
    twos = fives = 0
    while den % 2 == 0:
        den //= 2
        twos += 1
    while den % 5 == 0:
        den //= 5
        fives += 1
    sign = MINUS if value < 0 else ""
    if den != 1:
        return f"{sign}{abs(value.numerator)}/{value.denominator}"
    places = max(twos, fives)
    scaled = abs(value.numerator) * 10**places // value.denominator
    whole, frac = divmod(scaled, 10**places) if places else (scaled, 0)
    text = str(whole) + (("." + str(frac).rjust(places, "0")).rstrip("0").rstrip(".") if places else "")
    return sign + text


def _show(value: Fraction) -> str:
    """An operand inside an expression: negatives in parentheses."""
    text = exact_text(value)
    return f"({text})" if value < 0 else text


# ---- Properties -------------------------------------------------------------

@dataclass(frozen=True)
class _Property:
    id: str
    name: str
    rule: str


PROPERTIES = (
    _Property("commutative_add", "Commutative (addition)", "a + b = b + a"),
    _Property("commutative_mul", "Commutative (multiplication)", "a × b = b × a"),
    _Property("associative_add", "Associative (addition)", "(a + b) + c = a + (b + c)"),
    _Property("associative_mul", "Associative (multiplication)", "(a × b) × c = a × (b × c)"),
    _Property("distributive", "Distributive", "a × (b + c) = a × b + a × c"),
    _Property("identity_add", "Additive identity", "a + 0 = a"),
    _Property("identity_mul", "Multiplicative identity", "a × 1 = a"),
    _Property("inverse_add", "Additive inverse", "a + (−a) = 0"),
    _Property("inverse_mul", "Multiplicative inverse", "a × (1 ÷ a) = 1"),
)


def properties(a: str, b: str, c: str) -> list[dict]:
    """Check each property with a, b, c, both exactly and in floating point.

    Each entry: id, name, rule, the two sides with the numbers filled in, their
    exact values (text, and as the nearest float), their float values, and
    whether each pair agrees.
    The multiplicative inverse is skipped (``applies: False``) when a = 0.
    """
    A, B, C = (parse_number(x) for x in (a, b, c))
    fa, fb, fc = float(A), float(B), float(C)
    sa, sb, sc = _show(A), _show(B), _show(C)
    neg_a = _show(-A)
    # property id -> (formula function, its arguments, the two sides as text)
    rows = {
        "commutative_add": (formula.commutative_addition, 2, f"{sa} + {sb}", f"{sb} + {sa}"),
        "commutative_mul": (formula.commutative_multiplication, 2, f"{sa} × {sb}", f"{sb} × {sa}"),
        "associative_add": (formula.associative_addition, 3, f"({sa} + {sb}) + {sc}", f"{sa} + ({sb} + {sc})"),
        "associative_mul": (formula.associative_multiplication, 3, f"({sa} × {sb}) × {sc}", f"{sa} × ({sb} × {sc})"),
        "distributive": (formula.distributive, 3, f"{sa} × ({sb} + {sc})", f"{sa} × {sb} + {sa} × {sc}"),
        "identity_add": (formula.additive_identity, 1, f"{sa} + 0", sa),
        "identity_mul": (formula.multiplicative_identity, 1, f"{sa} × 1", sa),
        "inverse_add": (formula.additive_inverse, 1, f"{sa} + {neg_a}", "0"),
        "inverse_mul": (formula.multiplicative_inverse, 1, f"{sa} × (1 ÷ {sa})", "1"),
    }
    out = []
    for prop in PROPERTIES:
        if prop.id == "inverse_mul" and A == 0:
            out.append({"id": prop.id, "name": prop.name, "rule": prop.rule, "applies": False})
            continue
        fn, n, left, right = rows[prop.id]
        el, er = (Fraction(v) for v in fn(*(A, B, C)[:n]))  # exact: the real-number answer
        fl, fr = (float(v) for v in fn(*(fa, fb, fc)[:n]))  # the same expression in floating point
        out.append({
            "id": prop.id, "name": prop.name, "rule": prop.rule, "applies": True,
            "left": left, "right": right,
            "exact": [exact_text(el), exact_text(er)], "exact_holds": el == er,
            "exact_float": [float(el), float(er)],
            "float": [fl, fr], "float_holds": fl == fr,
        })
    return out


# ---- Order of operations ----------------------------------------------------

@dataclass
class _Num:
    value: Fraction
    fvalue: float


@dataclass
class _Bin:
    op: str
    left: object
    right: object
    paren: bool = False


@dataclass
class _Neg:
    child: object
    paren: bool = False


_TOKEN = re.compile(r"\s*(?:(\d+\.?\d*|\.\d+)|(\*\*|[-+*/^()×÷·−]))")
_NORMAL = {"×": "*", "·": "*", "÷": "/", "−": "-", "**": "^"}


def _tokenize(expr: str) -> list[str]:
    tokens, pos = [], 0
    expr = expr.rstrip()
    while pos < len(expr):
        match = _TOKEN.match(expr, pos)
        if not match:
            raise ValueError(f"Unexpected '{expr[pos:].strip()[0]}'. Use numbers, + − × ÷ ^ and parentheses.")
        tokens.append(match.group(1) or _NORMAL.get(match.group(2), match.group(2)))
        pos = match.end()
    if not tokens:
        raise ValueError("Enter an expression, e.g. 3 + 4 × 2.")
    return tokens


class _Parser:
    """Recursive descent. Precedence: ( ) > ^ (right to left) > unary − > × ÷ > + −; implicit 2(3) = 2 × 3."""

    def __init__(self, tokens: list[str]):
        self.tokens, self.i = tokens, 0

    def peek(self) -> str | None:
        return self.tokens[self.i] if self.i < len(self.tokens) else None

    def take(self) -> str:
        token = self.peek()
        if token is None:
            raise ValueError("The expression ends too soon.")
        self.i += 1
        return token

    def parse(self):
        node = self.expr()
        if self.peek() is not None:
            raise ValueError(f"Unexpected '{self.peek()}'.")
        return node

    def expr(self):
        node = self.term()
        while self.peek() in ("+", "-"):
            node = _Bin(self.take(), node, self.term())
        return node

    def term(self):
        node = self.unary()
        while self.peek() in ("*", "/") or self.peek() == "(":
            op = "*" if self.peek() == "(" else self.take()  # 2(3 + 4) means 2 × (3 + 4)
            node = _Bin(op, node, self.unary())
        return node

    def unary(self):
        if self.peek() == "-":
            self.take()
            child = self.unary()
            if isinstance(child, _Num):  # −3 is just a negative number
                return _Num(-child.value, -child.fvalue)
            return _Neg(child)
        if self.peek() == "+":
            self.take()
            return self.unary()
        return self.power()

    def power(self):
        base = self.atom()
        if self.peek() == "^":
            self.take()
            return _Bin("^", base, self.unary())
        return base

    def atom(self):
        token = self.take()
        if token == "(":
            node = self.expr()
            if self.take() != ")":
                raise ValueError("A '(' is missing its ')'.")
            if not isinstance(node, _Num):
                node.paren = True
            return node
        if token[0].isdigit() or token[0] == ".":
            return _Num(Fraction(token), float(token))
        raise ValueError(f"Unexpected '{token}'.")


def _render(node, top: bool = True) -> str:
    if isinstance(node, _Num):
        return exact_text(node.value) if top else _show(node.value)
    if isinstance(node, _Neg):
        text = MINUS + _render(node.child, False)
    else:
        sep = "" if node.op == "^" else " "
        text = f"{_render(node.left, False)}{sep}{OPS[node.op]}{sep}{_render(node.right, False)}"
    return f"({text})" if node.paren else text


def _fpow(base: float, n: int) -> float:
    """base ** n by repeated multiplication, so Python and JavaScript round identically."""
    result = 1.0
    for _ in range(abs(n)):
        result *= base
    return 1.0 / result if n < 0 else result


_RANK = formula.PRECEDENCE
_RULE = {"^": "Exponent", "neg": "Negation", "*": "Multiplication", "/": "Division", "+": "Addition", "-": "Subtraction"}


def _apply(node) -> tuple[_Num, str]:
    """Evaluate one reducible node; returns the number and the work, e.g. '2 × 3 = 6'."""
    if isinstance(node, _Neg):
        value, fvalue = -node.child.value, -node.child.fvalue
        work = f"{MINUS}({exact_text(node.child.value)})"
    else:
        a, b = node.left, node.right
        if node.op == "+":
            value, fvalue = a.value + b.value, a.fvalue + b.fvalue
        elif node.op == "-":
            value, fvalue = a.value - b.value, a.fvalue - b.fvalue
        elif node.op == "*":
            value, fvalue = a.value * b.value, a.fvalue * b.fvalue
        elif node.op == "/":
            if b.value == 0:
                raise ValueError("Division by zero is undefined.")
            value, fvalue = a.value / b.value, a.fvalue / b.fvalue
        else:
            if b.value.denominator != 1 or abs(b.value) > MAX_EXPONENT:
                raise ValueError(f"Exponents here must be whole numbers from −{MAX_EXPONENT} to {MAX_EXPONENT}.")
            if a.value == 0 and b.value < 0:
                raise ValueError("0 to a negative power divides by zero, so it is undefined.")
            value, fvalue = a.value ** int(b.value), _fpow(a.fvalue, int(b.value))
        sep = "" if node.op == "^" else " "
        work = f"{_show(a.value)}{sep}{OPS[node.op]}{sep}{_show(b.value)}"
    if len(str(value.numerator)) + len(str(value.denominator)) > MAX_DIGITS:
        raise ValueError("The numbers get too large to show exactly.")
    return _Num(value, fvalue), f"{work} = {exact_text(value)}"


def _walk(node, parent, side, depth, found, order):
    """Collect reducible nodes as (depth inside parentheses, rank, position, node, parent, side)."""
    if isinstance(node, _Num):
        return found
    depth += 1 if node.paren else 0
    position = order[0]
    order[0] += 1
    if isinstance(node, _Neg):
        _walk(node.child, node, "child", depth, found, order)
        if isinstance(node.child, _Num):
            found.append((depth, _RANK["neg"], position, node, parent, side))
    else:
        _walk(node.left, node, "left", depth, found, order)
        _walk(node.right, node, "right", depth, found, order)
        if isinstance(node.left, _Num) and isinstance(node.right, _Num):
            found.append((depth, _RANK[node.op], position, node, parent, side))
    return found


def order_of_operations(expr: str) -> dict:
    """Evaluate ``expr`` one operation at a time, in PEMDAS order.

    Each step does the operation inside the deepest parentheses first, then the
    highest-ranked operation (exponents, negation, multiply/divide, add/subtract),
    leftmost first among equals. Arithmetic is exact; the same steps are also
    done in floating point, and ``value`` is that float result, so the two can
    be compared. Returns {"start", "steps": [{rule, parentheses, work, expression}], "result", "value"}.
    """
    root = _Parser(_tokenize(expr)).parse()
    start = _render(root)
    steps = []
    while not isinstance(root, _Num):
        candidates = _walk(root, None, None, 0, [], [0])
        depth, _, _, node, parent, side = min(candidates, key=lambda f: (-f[0], -f[1], f[2]))
        number, work = _apply(node)
        if parent is None:
            root = number
        else:
            setattr(parent, side, number)
        rule = _RULE["neg" if isinstance(node, _Neg) else node.op]
        steps.append({"rule": rule, "parentheses": depth > 0, "work": work, "expression": _render(root)})
    return {"start": start, "steps": steps, "result": exact_text(root.value), "value": root.fvalue}


# ---- When grouping changes the answer --------------------------------------

def altitude_deg(sine: float) -> float | None:
    """arcsin in degrees, or ``None`` outside [−1, 1], where arcsin has no answer (NaN / domain error)."""
    if not -1.0 <= sine <= 1.0:
        return None
    return formula.solar_altitude(sine)


def guarded_altitude_deg(sine: float, tolerance: float = 1e-12) -> float:
    """arcsin after guarding the physical bounds: snap values within ``tolerance`` of 0 or ±1, then clamp to [−1, 1]."""
    if abs(sine) <= tolerance:
        sine = 0.0
    elif abs(abs(sine) - 1.0) <= tolerance:
        sine = math.copysign(1.0, sine)
    return formula.solar_altitude(max(-1.0, min(1.0, sine)))


def sum_two_ways(a: str, b: str, c: str) -> dict:
    """a + b + c grouped two ways in floating point, against the exact sum.

    Treats the sum as the sine of an angle, as in solar altitude, and reports
    arcsin of each: a grouping can land on the wrong side of 0 (a sun below
    the horizon) or just past 1 (no angle at all).
    """
    A, B, C = (parse_number(x) for x in (a, b, c))
    fa, fb, fc = float(A), float(B), float(C)
    exact = A + B + C
    left, right = formula.associative_addition(fa, fb, fc)
    return {
        "exact": exact_text(exact),
        "exact_value": float(exact),
        "left": left,
        "right": right,
        "same": left == right,
        "altitude": {"exact": altitude_deg(float(exact)), "left": altitude_deg(left), "right": altitude_deg(right)},
        "guarded": {"left": guarded_altitude_deg(left), "right": guarded_altitude_deg(right)},
    }


# ---- Exponent rules (A1.2) --------------------------------------------------

MAX_POWER = 20
MAX_POWER_BITS = 1000  # numerator + denominator bits: keeps every power inside a double's range (2^±1023)

EXPONENT_RULES = (
    _Property("product", "Product rule", "aᵐ × aⁿ = aᵐ⁺ⁿ"),
    _Property("quotient", "Quotient rule", "aᵐ ÷ aⁿ = aᵐ⁻ⁿ"),
    _Property("power", "Power of a power", "(aⁿ)ᵐ = aᵐⁿ"),
    _Property("zero", "Zero exponent", "a⁰ = 1"),
    _Property("negative", "Negative exponent", "a⁻ᵐ = 1 ÷ aᵐ"),
)


def parse_exponent(text: str, name: str) -> int:
    """'3' -> 3, '−2' -> -2: a whole number from −MAX_POWER to MAX_POWER."""
    s = text.strip().replace(MINUS, "-")
    if not re.fullmatch(r"[+-]?\d+", s) or abs(int(s)) > MAX_POWER:
        raise ValueError(f"{name} must be a whole number from −{MAX_POWER} to {MAX_POWER}.")
    return int(s)


def _int_text(k: int) -> str:
    return f"{MINUS}{-k}" if k < 0 else str(k)


def _pow_text(base: str, k: int) -> str:
    """'2^3', '2^(−3)'."""
    return f"{base}^({_int_text(k)})" if k < 0 else f"{base}^{k}"


def exponent_rules(a: str, m: str, n: str) -> list[dict]:
    """Check each exponent rule with base a and whole exponents m, n, exactly and in floating point.

    Same shape as ``properties``: the two sides with the numbers filled in, their
    exact and float values, and whether each pair agrees. The exact verdict is the
    rule's function in core/formula.py (True when its sides are equal) run on
    fractions.Fraction. Float powers use repeated multiplication (``_fpow``), as
    the order-of-operations stepper does, because pow() rounds differently in
    Python and in each browser. Rules that would need 0⁰ or 0 to a
    negative power are skipped (``applies: False``) with a ``note``.
    """
    A = parse_number(a)
    M, N = parse_exponent(m, "m"), parse_exponent(n, "n")
    biggest = max(abs(M), abs(N), abs(M + N), abs(M - N), abs(M * N))
    big = A ** biggest
    if A != 0 and big.numerator.bit_length() + big.denominator.bit_length() > MAX_POWER_BITS:
        raise ValueError("Those powers get too large to compare in floating point. Try a smaller base or exponents.")
    fa = float(A)
    sa = _show(A)

    # rule id -> (formula function, its arguments after a, exponents that must be positive when a = 0,
    #             the two sides as text, the two sides from base x and a power function p)
    rows = {
        "product": (formula.exponent_multiplication, (M, N), (M, N),
                    f"{_pow_text(sa, M)} × {_pow_text(sa, N)}", _pow_text(sa, M + N),
                    lambda x, p: (p(x, M) * p(x, N), p(x, M + N))),
        "quotient": (formula.exponent_division, (M, N), (M, N, 0),
                     f"{_pow_text(sa, M)} ÷ {_pow_text(sa, N)}", _pow_text(sa, M - N),
                     lambda x, p: (p(x, M) / p(x, N), p(x, M - N))),
        "power": (formula.exponent_raised_by_exponent, (M, N), (M, N),
                  _pow_text(f"({_pow_text(sa, N)})", M), _pow_text(sa, M * N),
                  lambda x, p: (p(p(x, N), M), p(x, M * N))),
        "zero": (formula.exponent_equal_to_zero, (), (0,),
                 _pow_text(sa, 0), "1",
                 lambda x, p: (p(x, 0), 1)),
        "negative": (formula.negative_exponent, (M,), (M, -M, 0),
                     _pow_text(sa, -M), f"1 ÷ {_pow_text(sa, M)}",
                     lambda x, p: (p(x, -M), 1 / p(x, M))),
    }
    out = []
    for rule in EXPONENT_RULES:
        fn, args, positive, left, right, sides = rows[rule.id]
        if A == 0 and min(positive) <= 0:
            note = "Needs a ≠ 0: 0⁰ is undefined." if rule.id == "zero" else "Needs a ≠ 0 here: 0 to a zero or negative power is undefined."
            out.append({"id": rule.id, "name": rule.name, "rule": rule.rule, "applies": False, "note": note})
            continue
        el, er = (Fraction(v) for v in sides(A, pow))
        fl, fr = sides(fa, _fpow)
        out.append({
            "id": rule.id, "name": rule.name, "rule": rule.rule, "applies": True,
            "left": left, "right": right,
            "exact": [exact_text(el), exact_text(er)], "exact_holds": bool(fn(A, *args)),
            "exact_float": [float(el), float(er)],
            "float": [float(fl), float(fr)], "float_holds": fl == fr,
        })
    return out


# ---- Ratios, proportions and percent change (A1.14) -------------------------

def _ratio_text(x: Fraction, y: Fraction) -> str:
    return f"{exact_text(x)} : {exact_text(y)}"


def simplest_ratio(x: Fraction, y: Fraction) -> str:
    """x : y in lowest whole terms: 0.5 : 1.5 -> '1 : 3'."""
    q = x / y
    return f"{_int_text(q.numerator)} : {q.denominator}"


def proportion(a: str, b: str, c: str, d: str) -> dict:
    """Is a : b = c : d? Each ratio in lowest terms, both quotients and cross products, exactly and in floating point.

    The verdicts come from formula.proportion run on fractions.Fraction and on float.
    """
    A, B, C, D = (parse_number(x) for x in (a, b, c, d))
    if B == 0 or D == 0:
        raise ValueError("The second term of a ratio can't be 0: a ÷ 0 is undefined.")
    fa, fb, fc, fd = float(A), float(B), float(C), float(D)
    left, right = formula.ratio(A, B), formula.ratio(C, D)
    return {
        "left": _ratio_text(*left), "right": _ratio_text(*right),
        "simplest": [simplest_ratio(*left), simplest_ratio(*right)],
        "exact": [exact_text(A / B), exact_text(C / D)], "exact_holds": formula.proportion(A, B, C, D),
        "cross": [exact_text(A * D), exact_text(B * C)],
        "float": [fa / fb, fc / fd], "float_holds": formula.proportion(fa, fb, fc, fd),
    }


def percent_change(original: str, new: str) -> dict:
    """Percent change from ``original`` to ``new``, exactly and in floating point, and the change that undoes it.

    ``undo`` is the percent change from new back to original (``None`` when new is 0):
    +50% is undone by −33⅓%, not −50%.
    """
    O, N = parse_number(original), parse_number(new)
    if O == 0:
        raise ValueError("The original value can't be 0: percent change divides by it.")
    exact = formula.percent_change(O, N)
    undo = formula.percent_change(N, O) if N != 0 else None
    return {
        "exact": exact_text(exact), "exact_value": float(exact),
        "float": formula.percent_change(float(O), float(N)),
        "direction": "increase" if exact > 0 else "decrease" if exact < 0 else "no change",
        "undo": None if undo is None else exact_text(undo),
        "undo_value": None if undo is None else float(undo),
    }
