"""A1.1 Properties of real numbers and order of operations, and where floating point breaks them.

    solver.py    the page's calculations, built on solver.pyformula.py (A1.1)
    html/        interactive page built on solver.py + general.web / general.styles
    api.py       what this topic publishes to the static API (PP.use / PP.embed)
"""

from .solver import order_of_operations, properties, sum_two_ways

__all__ = ["order_of_operations", "properties", "sum_two_ways"]
