"""Interactive slope page: two points, rise over run, and the line through them."""

from __future__ import annotations

from pathlib import Path

from general.styles import WIDGET
from general.themes import Theme
from general.web import CodeFile, render_page, write_page

from ..solver import solve
from ..style import ROLES

HTML_DIR = Path(__file__).resolve().parent
STATIC = HTML_DIR / "static"
TEMPLATE = HTML_DIR / "templates" / "slope.html"
DEFAULT_OUTPUT = HTML_DIR.parent / "output" / "slope.html"

MATH_SCRIPTS = (STATIC / "slope_math.js",)
BUNDLE = WIDGET.extend(css=[STATIC / "slope.css"], js=[*MATH_SCRIPTS, STATIC / "slope.js"])
# The "View the code" popup shows only the concept: this page's functions from core/formula.py.
FORMULA = HTML_DIR.parent.parent / "core" / "formula.py"  # the Algebra track's mathematics, one section per neuron
MATH = ("module", "rise", "run", "slope", "y_intercept", "x_intercept", "angle_of_inclination", "slope_intercept_form", "point_slope_form", "standard_form")
# The animation's toggles, in the gear menu in the corner of the stage.
SHOW = (("grid", "Grid"), ("labels", "Labels"), ("triangle", "Rise and run"), ("yint", "y-intercept"))
CODE = (CodeFile(FORMULA, "Slope in Python, as it reads: rise Δy = y₂ − y₁, run Δx = x₂ − x₁, then m = Δy / Δx.", only=MATH),)


def build_slope_html(
    x1: float = 1,
    y1: float = 1,
    x2: float = 4,
    y2: float = 3,
    output_path: str | Path | None = DEFAULT_OUTPUT,
    *,
    theme: str | Theme | None = None,
    title: str = "Slope",
) -> Path | str:
    """Build the page with the two points preloaded; ``output_path=None`` returns the HTML."""
    config = {
        "initial": {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
        "solution": solve(x1, y1, x2, y2).to_dict(),
        "roles": ROLES,
    }
    document = render_page(TEMPLATE, title=title, config=config, theme=theme, bundle=BUNDLE, code=CODE, show=SHOW)
    return document if output_path is None else write_page(document, output_path)
