"""Interactive quadratic page: solve ax² + bx + c = 0 and write it as a(x − h)² + k (A1.11 and A1.12)."""

from __future__ import annotations

from pathlib import Path

from general.styles import WIDGET
from general.themes import Theme
from general.web import CodeFile, render_page, write_page

from ..forms import solve
from ..style import ROLES

HTML_DIR = Path(__file__).resolve().parent
STATIC = HTML_DIR / "static"
TEMPLATE = HTML_DIR / "templates" / "quadratic.html"
DEFAULT_OUTPUT = HTML_DIR.parent / "output" / "quadratic.html"
FORMULA = HTML_DIR.parent.parent / "core" / "formula.py"  # the Algebra track's mathematics, one section per neuron

# The parabola's browser module, also loaded by other topics (factoring) and published to the API.
MATH_SCRIPTS = (STATIC / "quadratic_math.js",)
# This page's own calculations (forms.py) on top of it.
PAGE_SCRIPTS = (*MATH_SCRIPTS, STATIC / "forms_math.js")
BUNDLE = WIDGET.extend(css=[STATIC / "quadratic.css"], js=[*PAGE_SCRIPTS, STATIC / "quadratic.js"])
# The "View the code" popup shows only the concept: the A1.11 and A1.12 sections of core/formula.py.
MATH = (
    "module",
    "parabola",
    "discriminant",
    "quadratic_formula",
    "x_intercepts",
    "axis_of_symmetry",
    "vertex",
    "y_intercept_of_parabola",
    "opens",
    "vertex_form",
    "convert_standard_form_to_vertex_form",
    "convert_vertex_form_to_standard_form",
    "convert_factored_form_to_vertex_form",
)
# The animation's toggles, in the gear menu in the corner of the stage.
SHOW = (("grid", "Grid"), ("labels", "Labels"), ("parent", "Parent y = x²"), ("trail", "Each step's curve", False), ("symmetry", "Axis of symmetry"), ("intercepts", "Intercepts"))
CODE = (CodeFile(FORMULA, "The quadratic formula and the vertex form in Python, as they read, with the conversions between the forms.", only=MATH),)


def build_quadratic_html(
    a: float = 1,
    p: float = -3,
    q: float = 2,
    output_path: str | Path | None = DEFAULT_OUTPUT,
    *,
    form: str = "standard",
    theme: str | Theme | None = None,
    video_src: str | None = None,
    title: str = "Quadratic Formula & Vertex Form",
) -> Path | str:
    """Build the page with a quadratic preloaded: (a, b, c), or (a, h, k) / (a, r₁, r₂) with ``form``.

    ``theme`` picks a general.themes theme (default "portfolio"). ``video_src``
    optionally embeds a rendered Manim video (path relative to the HTML file,
    or a URL). ``output_path=None`` returns the HTML string instead of writing.
    """
    config = {
        "initial": {"form": form, "a": a, "p": p, "q": q},
        "solution": solve(form, a, p, q).to_dict(),
        "roles": ROLES,
        "video": video_src,
    }
    document = render_page(TEMPLATE, title=title, config=config, theme=theme, bundle=BUNDLE, code=CODE, show=SHOW)
    return document if output_path is None else write_page(document, output_path)
