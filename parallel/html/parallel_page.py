"""Interactive page: two lines through two points each, parallel (m₁ = m₂), perpendicular (m₁ · m₂ = −1) or neither."""

from __future__ import annotations

from pathlib import Path

from general.styles import WIDGET
from general.themes import Theme
from general.web import CodeFile, render_page, write_page

from ..solver import solve
from ..style import ROLES

HTML_DIR = Path(__file__).resolve().parent
STATIC = HTML_DIR / "static"
TEMPLATE = HTML_DIR / "templates" / "parallel.html"
DEFAULT_OUTPUT = HTML_DIR.parent / "output" / "parallel.html"

MATH_SCRIPTS = (STATIC / "parallel_math.js",)
BUNDLE = WIDGET.extend(css=[STATIC / "parallel.css"], js=[*MATH_SCRIPTS, STATIC / "parallel.js"])
# The "View the code" popup shows only the concept: this page's functions from core/formula.py.
FORMULA = HTML_DIR.parent.parent / "core" / "formula.py"  # the Algebra track's mathematics, one section per neuron
MATH = ("rise", "run", "slope", "is_parallel", "is_perpendicular")
# The animation's toggles, in the gear menu in the corner of the stage.
SHOW = (("grid", "Grid"), ("labels", "Labels"), ("triangles", "Slope triangles"))
CODE = (CodeFile(FORMULA, "Slope, and the parallel and perpendicular tests in Python, as they read.", only=MATH),)
DEFAULT = dict(x1=0, y1=1, x2=2, y2=5, x3=0, y3=3, x4=4, y4=1)


def build_parallel_html(
    points: dict | None = None,
    output_path: str | Path | None = DEFAULT_OUTPUT,
    *,
    theme: str | Theme | None = None,
    title: str = "Parallel & Perpendicular Lines",
) -> Path | str:
    """Build the page with the two lines' points preloaded; ``output_path=None`` returns the HTML."""
    points = {**DEFAULT, **(points or {})}
    config = {"initial": points, "solution": solve(**points).to_dict(), "roles": ROLES}
    document = render_page(TEMPLATE, title=title, config=config, theme=theme, bundle=BUNDLE, code=CODE, show=SHOW)
    return document if output_path is None else write_page(document, output_path)
