"""Calculation modules: formula.py (the mathematics) and lines.py (the solver built on it)."""

from .formula import linear_form, point_form_slope, standard_coefficients, standard_form_for_linear_form, x_intercept, y_intercept
from .lines import LineSolution, fmt, solve, standard_whole_numbers

__all__ = [
    "LineSolution",
    "fmt",
    "linear_form",
    "point_form_slope",
    "solve",
    "standard_coefficients",
    "standard_form_for_linear_form",
    "standard_whole_numbers",
    "x_intercept",
    "y_intercept",
]
