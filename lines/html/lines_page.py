"""Interactive page: one line in slope-intercept, point-slope and standard form."""

from __future__ import annotations

from pathlib import Path

from general.styles import WIDGET
from general.themes import Theme
from general.web import CodeFile, render_page, write_page

from ..core import solve
from ..style import ROLES

HTML_DIR = Path(__file__).resolve().parent
STATIC = HTML_DIR / "static"
TEMPLATE = HTML_DIR / "templates" / "lines.html"
DEFAULT_OUTPUT = HTML_DIR.parent / "output" / "lines.html"

MATH_SCRIPTS = (STATIC / "lines_math.js",)
BUNDLE = WIDGET.extend(css=[STATIC / "lines.css"], js=[*MATH_SCRIPTS, STATIC / "lines.js"])
# The "View the code" popup shows only the concept: core/formula.py, the math as written.
CODE = (CodeFile(HTML_DIR.parent / "core" / "formula.py", "The three forms of a line in Python, as they read, and the conversions between them."),)


def build_lines_html(
    x1: float = 1,
    y1: float = 3,
    m: float = 2,
    output_path: str | Path | None = DEFAULT_OUTPUT,
    *,
    theme: str | Theme | None = None,
    title: str = "Equations of a Line",
) -> Path | str:
    """Build the page with the point and slope preloaded; ``output_path=None`` returns the HTML."""
    config = {"initial": {"x1": x1, "y1": y1, "m": m}, "solution": solve(x1, y1, m).to_dict(), "roles": ROLES}
    document = render_page(TEMPLATE, title=title, config=config, theme=theme, bundle=BUNDLE, code=CODE)
    return document if output_path is None else write_page(document, output_path)
