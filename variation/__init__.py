"""A1.13 Direct & Inverse Variation: y = kx and y = k / x, with k found from one known point.

    solver.py    the page's calculations, built on core/formula.py (A1.13)
    html/        interactive page built on solver.py + general.web / general.styles
    style.py     maps this topic's elements onto general theme roles
    api.py       what this topic publishes to the static API (PP.use / PP.embed)
"""

from .solver import solve

__all__ = ["solve"]
