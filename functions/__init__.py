"""A1.9 Functions, Domain & Range: a rule f, the inputs it allows, the outputs it produces, and the vertical line test.

    solver.py    the page's calculations, built on core/formula.py (A1.9)
    html/        interactive page built on solver.py + general.web / general.styles
    style.py     maps this topic's elements onto general theme roles
    api.py       what this topic publishes to the static API (PP.use / PP.embed)
"""

from .solver import solve

__all__ = ["solve"]
