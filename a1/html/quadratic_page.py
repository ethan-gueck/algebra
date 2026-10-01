"""Interactive quadratic-formula page."""

from __future__ import annotations

from pathlib import Path

from general.styles import WIDGET
from general.themes import Theme
from general.web import CodeFile, render_page, write_page

from ..core import solve
from ..style import ROLES

HTML_DIR = Path(__file__).resolve().parent
STATIC = HTML_DIR / "static"
TEMPLATE = HTML_DIR / "templates" / "quadratic.html"
DEFAULT_OUTPUT = HTML_DIR.parent / "output" / "quadratic.html"

# Scripts the browser module needs (also published to the API by api.py).
MATH_SCRIPTS = (STATIC / "quadratic_math.js",)
# The "View the code" popup shows only the mathematics at the top of core/formula.py, not the solver below it.
MATH = ("module", "parabola", "discriminant", "quadratic_formula", "x_intercepts", "axis_of_symmetry", "vertex", "y_intercept", "opens", "vertex_form", "factored_form")
CODE = (CodeFile(HTML_DIR.parent / "core" / "formula.py", "The quadratic formula in Python, as it reads: Δ = b² − 4ac, then x = (−b ± √Δ) / 2a.", only=MATH),)
BUNDLE = WIDGET.extend(css=[STATIC / "quadratic.css"], js=[*MATH_SCRIPTS, STATIC / "quadratic.js"])


def build_quadratic_html(
    a: float = 1,
    b: float = -3,
    c: float = 2,
    output_path: str | Path | None = DEFAULT_OUTPUT,
    *,
    theme: str | Theme | None = None,
    video_src: str | None = None,
    title: str = "Quadratic Formula",
) -> Path | str:
    """Build the page with (a, b, c) preloaded.

    ``theme`` picks a general.themes theme (default "portfolio"). ``video_src``
    optionally embeds a rendered Manim video (path relative to the HTML file,
    or a URL). ``output_path=None`` returns the HTML string instead of writing.
    """
    config = {
        "initial": {"a": a, "b": b, "c": c},
        "solution": solve(a, b, c).to_dict(),
        "roles": ROLES,
        "video": video_src,
    }
    document = render_page(TEMPLATE, title=title, config=config, theme=theme, bundle=BUNDLE, code=CODE)
    return document if output_path is None else write_page(document, output_path)
