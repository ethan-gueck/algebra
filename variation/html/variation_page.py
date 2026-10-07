"""Interactive page: direct (y = kx) and inverse (y = k / x) variation, with k found from one known point."""

from __future__ import annotations

from pathlib import Path

from general.styles import WIDGET
from general.themes import Theme
from general.web import CodeFile, render_page, write_page

from ..solver import solve
from ..style import ROLES

HTML_DIR = Path(__file__).resolve().parent
STATIC = HTML_DIR / "static"
TEMPLATE = HTML_DIR / "templates" / "variation.html"
DEFAULT_OUTPUT = HTML_DIR.parent / "output" / "variation.html"

MATH_SCRIPTS = (STATIC / "variation_math.js",)
BUNDLE = WIDGET.extend(css=[STATIC / "variation.css"], js=[*MATH_SCRIPTS, STATIC / "variation.js"])
# The "View the code" popup shows only the concept: this page's functions from core/formula.py.
FORMULA = HTML_DIR.parent.parent / "core" / "formula.py"  # the Algebra track's mathematics, one section per neuron
MATH = ("module", "direct_variation", "indirect_variation")
# The animation's toggles, in the gear menu in the corner of the stage.
SHOW = (("grid", "Grid"), ("labels", "Labels"), ("invariant", "Triangles / rectangles (= k)"))
CODE = (CodeFile(FORMULA, "Direct and inverse variation in Python, as they read.", only=MATH),)


def build_variation_html(
    x1: float = 2,
    y1: float = 6,
    x2: float = 4,
    output_path: str | Path | None = DEFAULT_OUTPUT,
    *,
    kind: str = "direct",
    theme: str | Theme | None = None,
    title: str = "Direct & Inverse Variation",
) -> Path | str:
    """Build the page with the known point, the new x and the kind (direct or inverse) preloaded; ``output_path=None`` returns the HTML."""
    config = {"initial": {"x1": x1, "y1": y1, "x2": x2, "kind": kind}, "solution": solve(x1, y1, x2, kind).to_dict(), "roles": ROLES}
    document = render_page(TEMPLATE, title=title, config=config, theme=theme, bundle=BUNDLE, code=CODE, show=SHOW)
    return document if output_path is None else write_page(document, output_path)
