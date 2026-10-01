"""Slope and the line it describes, written the way they read.

    Δy = y₂ − y₁,  Δx = x₂ − x₁      rise and run
    m  = Δy / Δx                     slope (rise over run)
    b  = y₁ − m·x₁                   y-intercept
    x  = x₁ − y₁ / m                 x-intercept (where y = 0)
    θ  = arctan(m)                   angle of inclination
    y = mx + b,  y − y₁ = m(x − x₁),  Ax + By = C    the line's three forms
"""

import math


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
