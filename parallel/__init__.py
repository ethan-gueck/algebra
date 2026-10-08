"""A1.6 Parallel & Perpendicular Lines: two lines, each through two points, compared by their slopes.

    solver.py    the page's calculations, built on core/formula.py (A1.4 slope, A1.6)
    html/        interactive page built on solver.py + general.web / general.styles
    style.py     maps this topic's elements onto general theme roles
    api.py       what this topic publishes to the static API (PP.use / PP.embed)
"""

from .solver import solve

__all__ = ["solve"]
