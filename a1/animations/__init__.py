"""Animation layer: the Manim scene for this topic, built on solver.py and general.animations.

Importing this package does not import Manim; only rendering does.
"""

from .render import render_quadratic

__all__ = ["render_quadratic"]
