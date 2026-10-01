"""A1.4 Slope: rise over run between two points, and the line through them.

    core/        pure calculations (source of truth)
    html/        interactive page built on core/ + general.web / general.styles
    style.py     maps this topic's elements onto general theme roles
    api.py       what this topic publishes to the static API (PP.use / PP.embed)
"""

from .core import solve

__all__ = ["solve"]
