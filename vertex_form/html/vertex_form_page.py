"""Interactive page: the vertex form y = a(x − h)² + k, built from y = x² and converted to and from standard form."""

from __future__ import annotations

from pathlib import Path

from a1.html.quadratic_page import MATH_SCRIPTS as QUADRATIC_SCRIPTS
from general.styles import WIDGET
from general.themes import Theme
from general.web import CodeFile, render_page, write_page

from ..solver import solve
from ..style import ROLES

HTML_DIR = Path(__file__).resolve().parent
STATIC = HTML_DIR / "static"
TEMPLATE = HTML_DIR / "templates" / "vertex_form.html"
DEFAULT_OUTPUT = HTML_DIR.parent / "output" / "vertex_form.html"
FORMULA = HTML_DIR.parent.parent / "core" / "formula.py"  # the Algebra track's mathematics, one section per neuron

# The parabola's details come from the quadratic topic's browser module, so it loads first.
MATH_SCRIPTS = (*QUADRATIC_SCRIPTS, STATIC / "vertex_form_math.js")
BUNDLE = WIDGET.extend(css=[STATIC / "vertex_form.css"], js=[*MATH_SCRIPTS, STATIC / "vertex_form.js"])
# The "View the code" popup shows only the concept: the A1.12 section of core/formula.py.
MATH = (
    "module",
    "vertex_form",
    "convert_standard_form_to_vertex_form",
    "convert_vertex_form_to_standard_form",
    "convert_factored_form_to_vertex_form",
)
# The animation's toggles, in the gear menu in the corner of the stage.
SHOW = (("grid", "Grid"), ("labels", "Labels"), ("parent", "Parent y = x²"), ("trail", "Each step's curve", False), ("symmetry", "Axis of symmetry"), ("intercepts", "Intercepts"))
CODE = (CodeFile(FORMULA, "The vertex form in Python, and the conversions into and out of it.", only=MATH),)


def build_vertex_form_html(
    form: str = "vertex",
    a: float = 2,
    p: float = 1,
    q: float = -8,
    output_path: str | Path | None = DEFAULT_OUTPUT,
    *,
    theme: str | Theme | None = None,
    title: str = "Vertex Form",
) -> Path | str:
    """Build the page with a quadratic preloaded; ``output_path=None`` returns the HTML."""
    config = {"initial": {"form": form, "a": a, "p": p, "q": q}, "solution": solve(form, a, p, q).to_dict(), "roles": ROLES}
    document = render_page(TEMPLATE, title=title, config=config, theme=theme, bundle=BUNDLE, code=CODE, show=SHOW)
    return document if output_path is None else write_page(document, output_path)
