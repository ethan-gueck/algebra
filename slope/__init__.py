"""A1.4 Slope: rise over run between two points, and the line through them.

    solver.py    the page's calculations, built on solver.pyformula.py (A1.4 Slope)
    html/        interactive page built on solver.py + general.web / general.styles
    style.py     maps this topic's elements onto general theme roles
    api.py       what this topic publishes to the static API (PP.use / PP.embed)
"""

from .solver import solve

__all__ = ["solve"]
