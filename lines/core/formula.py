"""Equations of a line, written the way they read.

    y = mx + b                slope-intercept form
    y − y₁ = m(x − x₁)        point-slope form
    Ax + By = C               standard form

All three describe the same line; the conversions below move between them.
"""


def linear_form(b, c, x):
    """y = bx + c: slope b, y-intercept c (usually written y = mx + b)"""
    return b * x + c


def point_form_slope(x1, y1, m, x):
    """y − y₁ = m(x − x₁), solved for y"""
    return m * (x - x1) + y1


def standard_form_for_linear_form(A, B, C, x):
    """Ax + By = C, solved for y: y = (C − Ax) / B, for B ≠ 0"""
    return (C - A * x) / B


def y_intercept(x1, y1, m):
    """b = y₁ − m·x₁: point-slope form at x = 0"""
    return y1 - m * x1


def x_intercept(m, b):
    """x = −b / m: where y = 0, for m ≠ 0"""
    return -b / m


def standard_coefficients(m, b):
    """y = mx + b rearranged to Ax + By = C: A = −m, B = 1, C = b"""
    return -m, 1, b
