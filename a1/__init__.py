"""A1 algebra: quadratic equations (template topic).

Layout (copy this folder to start a new topic):

    core/        pure calculations, no rendering deps (source of truth)
    animations/  Manim scene built on core/ + general.animations (optional: needs `manim`)
    html/        interactive page built on core/ + general.web / general.styles
    style.py     maps this topic's elements onto general theme roles
    api.py       what this topic publishes to the static API (PP.use / PP.embed)
    __main__.py  CLI:  python -m a1 --help

Shared themes, CSS/JS, plotting and page building live in the repo's general/.
"""

import sys
from pathlib import Path

try:
    import general  # noqa: F401
except ImportError:  # Not installed: find the repo root (the folder holding general/) and use it.
    for _parent in Path(__file__).resolve().parents:
        if (_parent / "general" / "__init__.py").exists():
            sys.path.insert(0, str(_parent))
            break

from .core import solve  # noqa: E402

__all__ = ["solve"]
