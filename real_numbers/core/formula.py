"""Properties of real numbers and the order of operations, written the way they read.

Each property returns its two sides. For real numbers the sides are always
equal; real_numbers.py runs these same functions on exact fractions and on
floating-point numbers to see where a computer disagrees. The solar altitude at
the end is the real case where that disagreement mattered.
"""

import math


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

