"""A2.3 Complex Numbers: z = a + bi on the complex plane, with i² = −1, the conjugate and the modulus.

    solver.py    the page's calculations, built on core/formula.py (A2.3)
    html/        interactive page built on solver.py + general.web / general.styles
    style.py     maps this topic's elements onto general theme roles
    api.py       what this topic publishes to the static API (PP.use / PP.embed)
"""

from .solver import solve

__all__ = ["solve"]
