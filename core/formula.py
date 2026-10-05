"""Algebra: the mathematics behind every neuron in this track, in flashcard order (A1.1 … A2.15).

Sections stay empty until that neuron is built. The pages' scaffolding
(solvers, text, plot windows) lives in each topic folder and imports from
here, and each page's "View the code" popup shows the functions it uses from
this file.
"""

import cmath
import math


# _____________ A1.1 Properties of Real Numbers & Order of Operations _____________

def commutative_addition(a, b):
    """a + b = b + a"""
    return a + b, b + a


def commutative_multiplication(a, b):
    """a × b = b × a"""
    return a * b, b * a


def associative_addition(a, b, c):
    """(a + b) + c = a + (b + c)"""
    return (a + b) + c, a + (b + c)


def associative_multiplication(a, b, c):
    """(a × b) × c = a × (b × c)"""
    return (a * b) * c, a * (b * c)


def distributive(a, b, c):
    """a × (b + c) = a × b + a × c"""
    return a * (b + c), a * b + a * c


def additive_identity(a):
    """a + 0 = a"""
    return a + 0, a


def multiplicative_identity(a):
    """a × 1 = a"""
    return a * 1, a


def additive_inverse(a):
    """a + (−a) = 0"""
    return a + (-a), 0


def multiplicative_inverse(a):
    """a × (1 ÷ a) = 1, for a ≠ 0"""
    return a * (1 / a), 1


def sine_of_solar_altitude(latitude, declination, hour_angle):
    """sin(Hc) = cos(Lat)·cos(δ)·cos(ω) + sin(Lat)·sin(δ), angles in radians"""
    return math.cos(latitude) * math.cos(declination) * math.cos(hour_angle) + math.sin(latitude) * math.sin(declination)


def solar_altitude(sine):
    """Hc = arcsin(sin Hc), in degrees: the sun's angle above the horizon"""
    return math.degrees(math.asin(sine))


# PEMDAS: Parentheses first, then the higher rank goes first; equal ranks go left to right
# (exponents stack right to left). "neg" is a leading minus sign, as in −2² = −(2²).
PRECEDENCE = {"^": 4, "neg": 3, "*": 2, "/": 2, "+": 1, "-": 1}


# _____________ A1.2 Exponent Rules _____________

def power_of_a_power(a, m, n):
    """(a^m)^n = a^(m·n)"""
    return a ** (m * n)

# ... to be continued: more exponent rules needed ...


# _____________ A1.3 Radicals & Rational Exponents _____________


# _____________ A1.4 Slope _____________

def rise(y1, y2):
    """Δy = y₂ − y₁"""
    return y2 - y1


def run(x1, x2):
    """Δx = x₂ − x₁"""
    return x2 - x1


def slope(x1, y1, x2, y2):
    """m = (y₂ − y₁) / (x₂ − x₁)"""
    return rise(y1, y2) / run(x1, x2)


def y_intercept(m, x1, y1):
    """b = y₁ − m·x₁: where the line crosses x = 0."""
    return y1 - m * x1


def x_intercept(m, x1, y1):
    """x = x₁ − y₁ / m: where the line crosses y = 0."""
    return x1 - y1 / m


def angle_of_inclination(m):
    """θ = arctan(m), in degrees from the positive x-axis."""
    return math.degrees(math.atan(m))


def slope_intercept_form(m, b, x):
    """y = mx + b"""
    return m * x + b


def point_slope_form(m, x1, y1, x):
    """y − y₁ = m(x − x₁), solved for y"""
    return y1 + m * (x - x1)


def standard_form(x1, y1, x2, y2):
    """Ax + By = C with A = y₂ − y₁, B = x₁ − x₂, C = A·x₁ + B·y₁"""
    A, B = y2 - y1, x1 - x2
    return A, B, A * x1 + B * y1


# _____________ A1.5 Equations of a Line _____________

def linear_form(b, c, x):
    """y = bx + c: slope b, y-intercept c (usually written y = mx + b)"""
    return b * x + c


def point_form_slope(x1, y1, m, x):
    """y − y₁ = m(x − x₁), solved for y"""
    return m * (x - x1) + y1


def standard_form_for_linear_form(A, B, C, x):
    """Ax + By = C, solved for y: y = (C − Ax) / B, for B ≠ 0"""
    return (C - A * x) / B


def x_intercept_of_linear_form(m, b):
    """x = −b / m: where y = 0, for m ≠ 0"""
    return -b / m


def standard_coefficients(m, b):
    """y = mx + b rearranged to Ax + By = C: A = −m, B = 1, C = b"""
    return -m, 1, b


# _____________ A1.6 Parallel & Perpendicular Lines _____________


# _____________ A1.7 Absolute Value Equations & Inequalities _____________


# _____________ A1.8 Systems of Linear Equations _____________


# _____________ A1.9 Polynomial Products & Special Products _____________


# _____________ A1.10 Factoring _____________

def factored_form(a, r1, r2, x):
    """y = a(x − r₁)(x − r₂)"""
    return a * (x - r1) * (x - r2)


def convert_standard_form_to_factored_form(a, b, c):
    """ax² + bx + c = a(x − r₁)(x − r₂), with r = (−b ± √Δ) / 2a (real only when Δ ≥ 0)."""
    d = discriminant(a, b, c)
    if d < 0:
        raise ValueError("The quadratic does not have real roots.")
    root1 = (-b + math.sqrt(d)) / (2 * a)
    root2 = (-b - math.sqrt(d)) / (2 * a)
    return a, root1, root2


def convert_vertex_form_to_factored_form(a, h, k):
    """a(x − h)² + k = 0 gives (x − h)² = −k/a, so r = h ± √(−k/a) (real only when −k/a ≥ 0)."""
    square = -k / a
    if square < 0:
        raise ValueError("The vertex form does not yield real roots.")
    root1 = h + math.sqrt(square)
    root2 = h - math.sqrt(square)
    return a, root1, root2


def convert_factored_form_to_standard_form(a, r1, r2):
    """a(x − r₁)(x − r₂) = ax² − a(r₁ + r₂)x + a·r₁r₂"""
    b = -a * (r1 + r2)
    c = a * r1 * r2
    return a, b, c


def ac_method(a, b, c):
    """The two numbers m, n with m·n = ac and m + n = b, which split bx into mx + nx.

    They are the roots of t² − bt + ac = 0, so m, n = (b ± √Δ) / 2: whole numbers
    exactly when a, b, c are whole and Δ is a perfect square.
    """
    d = discriminant(a, b, c)
    return (b + math.sqrt(d)) / 2, (b - math.sqrt(d)) / 2


# _____________ A1.11 Quadratic Formula & Discriminant _____________

def parabola(a, b, c, x):
    """y = ax² + bx + c"""
    return a * x**2 + b * x + c


def discriminant(a, b, c):
    """Δ = b² − 4ac"""
    return b**2 - 4 * a * c


def quadratic_formula(a, b, c):
    """x = (−b ± √(b² − 4ac)) / 2a: both solutions of ax² + bx + c = 0."""
    root = cmath.sqrt(discriminant(a, b, c))
    return (-b + root) / (2 * a), (-b - root) / (2 * a)


def x_intercepts(a, b, c):
    """Where y = 0: the real solutions of the quadratic formula (none when Δ < 0)."""
    if discriminant(a, b, c) < 0:
        return []
    return sorted({x.real for x in quadratic_formula(a, b, c)})


def axis_of_symmetry(a, b):
    """x = −b / 2a"""
    return -b / (2 * a)


def vertex(a, b, c):
    """(h, k) with h = −b / 2a and k = f(h)"""
    h = axis_of_symmetry(a, b)
    return h, parabola(a, b, c, h)


def y_intercept_of_parabola(a, b, c):
    """(0, f(0)) = (0, c)"""
    return 0, parabola(a, b, c, 0)


def opens(a):
    """Up when a > 0 (the vertex is a minimum), down when a < 0 (a maximum)."""
    return "up" if a > 0 else "down"


# _____________ A1.12 Vertex Form of a Quadratic _____________

def vertex_form(a, h, k, x):
    """y = a(x − h)² + k"""
    return a * (x - h) ** 2 + k


def convert_standard_form_to_vertex_form(a, b, c):
    """Complete the square: ax² + bx + c = a(x − h)² + k, with h = −b / 2a and k = f(h)."""
    h = -b / (2 * a)
    k = parabola(a, b, c, h)
    return a, h, k


def convert_vertex_form_to_standard_form(a, h, k):
    """a(x − h)² + k = ax² − 2ahx + (ah² + k)"""
    b = -2 * a * h
    c = a * h**2 + k
    return a, b, c


def convert_factored_form_to_vertex_form(a, r1, r2):
    """The vertex sits midway between the roots: h = (r₁ + r₂) / 2, k = a(h − r₁)(h − r₂)."""
    h = (r1 + r2) / 2
    k = factored_form(a, r1, r2, h)
    return a, h, k


# _____________ A1.13 Direct & Inverse Variation _____________


# _____________ A1.14 Ratios, Proportions & Percent Change _____________

def ratio(a, b):
    """a : b"""
    return a, b

def proportion(a, b, c, d):
    """a : b = c : d"""
    return a / b == c / d

def percent_change(original, new):
    """(new − original) ÷ original × 100%"""
    return (new - original) / original * 100

# _____________ A1.15 Linear Inequalities _____________

def linear_inequality(a, b, c):
    """a > b implies a + c > b + c and ac > bc for c > 0, ac < bc for c < 0 (c ≠ 0)."""
    return (a > b) == (a + c > b + c) and (a > b) == (a*c > b*c if c > 0 else a*c < b*c)

# _____________ A1.16 Sets, Set Operations & Interval Notation _____________


# _____________ A2.1 Functions: Composition & Inverses _____________


# _____________ A2.2 Transformations of Functions _____________


# _____________ A2.3 Complex Numbers _____________

def complex_to_real(i):
    """i² = −1"""
    return i**2

def complex_standard_form(a, b):
    """z = a + bi"""
    return complex(a, b)

def complex_conjugate(z):
    """If z = a + bi, then z̄ = a − bi"""
    return z.real - z.imag * 1j

def complex_modulus(z):
    """|z| = √(a² + b²)"""
    return abs(z)


# _____________ A2.4 Remainder, Factor & Rational Root Theorems _____________


# _____________ A2.5 Rational Functions & Asymptotes _____________


# _____________ A2.6 Exponential Growth & Decay _____________


# _____________ A2.7 Logarithms: Definition & Properties _____________


# _____________ A2.8 Change of Base & Exponential Equations _____________


# _____________ A2.9 Arithmetic Sequences & Series _____________


# _____________ A2.10 Geometric Sequences & Series _____________


# _____________ A2.11 Sigma Notation & Summation Formulas _____________


# _____________ A2.12 Binomial Theorem _____________


# _____________ A2.13 Matrix Operations _____________


# _____________ A2.14 Determinants, Inverses & Cramer’s Rule _____________


# _____________ A2.15 Conic Sections _____________
