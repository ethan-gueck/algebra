"""A1.13 Special products and A1.14 Factoring: the products factoring undoes, one
quadratic in standard, vertex and factored form, and whether (and how) it factors.

    solver.py    the page's calculations, built on core/formula.py (A1.13, A1.14, A1.16)
    html/        interactive page built on solver.py + general.web / general.styles
    style.py     maps this topic's elements onto general theme roles
    api.py       what this topic publishes to the static API (PP.use / PP.embed)
"""

from .solver import solve, special_products_table

__all__ = ["solve", "special_products_table"]
