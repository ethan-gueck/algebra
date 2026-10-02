"""A1.10 Factoring: one quadratic in standard, vertex and factored form, and whether (and how) it factors.

    solver.py    the page's calculations, built on solver.pyformula.py (A1.10, A1.12)
    html/        interactive page built on solver.py + general.web / general.styles
    style.py     maps this topic's elements onto general theme roles
    api.py       what this topic publishes to the static API (PP.use / PP.embed)
"""

from .solver import solve

__all__ = ["solve"]
