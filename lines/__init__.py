"""A1.5 Equations of a Line and A1.15 Linear Inequalities: one line in slope-intercept, point-slope and standard form, and the inequalities it bounds.

    solver.py    the page's calculations, built on core/formula.py (A1.5, A1.15)
    html/        interactive page built on solver.py + general.web / general.styles
    style.py     maps this topic's elements onto general theme roles
    api.py       what this topic publishes to the static API (PP.use / PP.embed)
"""

from .solver import solve

__all__ = ["solve"]
