"""A1.1 Properties of real numbers and order of operations, and where floating point breaks them.

    core/        pure calculations (source of truth)
    html/        interactive page built on core/ + general.web / general.styles
    api.py       what this topic publishes to the static API (PP.use / PP.embed)
"""

from .core import order_of_operations, properties, sum_two_ways

__all__ = ["order_of_operations", "properties", "sum_two_ways"]
