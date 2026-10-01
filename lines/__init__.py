"""A1.5 Equations of a line: one line in slope-intercept, point-slope and standard form.

    core/        formula.py (the mathematics) and lines.py (the solver)
    html/        interactive page built on core/ + general.web / general.styles
    style.py     maps this topic's elements onto general theme roles
    api.py       what this topic publishes to the static API (PP.use / PP.embed)
"""

from .core import solve

__all__ = ["solve"]
