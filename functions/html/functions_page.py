"""Interactive page: a rule f(x), its domain and range, f(x₀), and the vertical line test."""

from __future__ import annotations

from pathlib import Path

from general.styles import WIDGET
from general.themes import Theme
from general.web import CodeFile, render_page, write_page

from ..solver import solve
from ..style import ROLES

HTML_DIR = Path(__file__).resolve().parent
STATIC = HTML_DIR / "static"
TEMPLATE = HTML_DIR / "templates" / "functions.html"
DEFAULT_OUTPUT = HTML_DIR.parent / "output" / "functions.html"

MATH_SCRIPTS = (STATIC / "functions_math.js",)
BUNDLE = WIDGET.extend(css=[STATIC / "functions.css"], js=[*MATH_SCRIPTS, STATIC / "functions.js"])
# The "View the code" popup shows only the concept: this page's functions from core/formula.py.
FORMULA = HTML_DIR.parent.parent / "core" / "formula.py"  # the Algebra track's mathematics, one section per neuron
MATH = ("function_notation", "denominator_allowed", "even_root_allowed", "log_allowed", "vertical_line_test")
# The animation's toggles, in the gear menu in the corner of the stage.
SHOW = (("grid", "Grid"), ("labels", "Labels"), ("asymptotes", "Asymptotes"))
CODE = (CodeFile(FORMULA, "Function notation, the three domain restrictions and the vertical line test in Python, as they read.", only=MATH),)
DEFAULT = dict(a=1, h=2, k=0, x0=4)
DEFAULT_FAMILY = "reciprocal"  # the card's example: f(x) = 1 / (x − 2), domain (−∞, 2) ∪ (2, ∞)


def build_functions_html(
    params: dict | None = None,
    family: str = DEFAULT_FAMILY,
    output_path: str | Path | None = DEFAULT_OUTPUT,
    *,
    theme: str | Theme | None = None,
    title: str = "Functions, Domain & Range",
) -> Path | str:
    """Build the page with a, h, k, x₀ and the family preloaded; ``output_path=None`` returns the HTML."""
    params = {**DEFAULT, **(params or {})}
    config = {"initial": {**params, "family": family}, "solution": solve(**params, family=family).to_dict(), "roles": ROLES}
    document = render_page(TEMPLATE, title=title, config=config, theme=theme, bundle=BUNDLE, code=CODE, show=SHOW)
    return document if output_path is None else write_page(document, output_path)
