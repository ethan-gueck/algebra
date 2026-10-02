"""A1.12 Vertex Form of a Quadratic: y = a(x − h)² + k as y = x² shifted, stretched and lifted.

    solver.py    the page's calculations, built on core/formula.py (A1.12)
    html/        interactive page built on solver.py + general.web / general.styles
    style.py     maps this topic's elements onto general theme roles
    api.py       what this topic publishes to the static API (PP.use / PP.embed)
"""

from .solver import solve

__all__ = ["solve"]
