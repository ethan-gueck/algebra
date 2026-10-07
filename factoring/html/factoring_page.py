"""Interactive page: the special products, one quadratic in standard, vertex and factored form, and how it factors."""

from __future__ import annotations

from pathlib import Path

from a1.html.quadratic_page import MATH_SCRIPTS as QUADRATIC_SCRIPTS
from general.styles import WIDGET
from general.themes import Theme
from general.web import CodeFile, render_page, write_page

from ..solver import solve, special_products_table
from ..style import ROLES

HTML_DIR = Path(__file__).resolve().parent
STATIC = HTML_DIR / "static"
TEMPLATE = HTML_DIR / "templates" / "factoring.html"
DEFAULT_OUTPUT = HTML_DIR.parent / "output" / "factoring.html"
FORMULA = HTML_DIR.parent.parent / "core" / "formula.py"  # the Algebra track's mathematics, one section per neuron

# The parabola's details come from the quadratic topic's browser module, so it loads first.
MATH_SCRIPTS = (*QUADRATIC_SCRIPTS, STATIC / "factoring_math.js")
BUNDLE = WIDGET.extend(css=[STATIC / "factoring.css"], js=[*MATH_SCRIPTS, STATIC / "factoring.js"])
# The "View the code" popup shows only the concept: the A1.9, A1.10 and A1.12 sections of core/formula.py.
MATH = (
    "module",
    "polynomial_products",
    "special_products",
    "factored_form",
    "convert_standard_form_to_factored_form",
    "convert_vertex_form_to_factored_form",
    "convert_factored_form_to_standard_form",
    "ac_method",
    "discriminant",
    "vertex_form",
    "convert_standard_form_to_vertex_form",
    "convert_vertex_form_to_standard_form",
    "convert_factored_form_to_vertex_form",
)
# The animation's toggles, in the gear menu in the corner of the stage.
SHOW = (("grid", "Grid"), ("labels", "Labels"), ("symmetry", "Axis of symmetry"), ("intercepts", "Intercepts"))
CODE = (CodeFile(FORMULA, "The special products, the three forms of a quadratic in Python, the conversions between them, and the AC method.", only=MATH),)
PRODUCTS = (0.1, 0.3)  # a, b for the special-products table: == fails on every row, math.isclose holds


def build_factoring_html(
    form: str = "standard",
    a: float = 2,
    p: float = 1,
    q: float = -6,
    output_path: str | Path | None = DEFAULT_OUTPUT,
    *,
    theme: str | Theme | None = None,
    title: str = "Special Products & Factoring",
) -> Path | str:
    """Build the page with a quadratic preloaded; ``output_path=None`` returns the HTML."""
    config = {
        "initial": {"form": form, "a": a, "p": p, "q": q}, "solution": solve(form, a, p, q).to_dict(), "roles": ROLES,
        "products_initial": list(PRODUCTS), "products": special_products_table(*PRODUCTS),
    }
    document = render_page(TEMPLATE, title=title, config=config, theme=theme, bundle=BUNDLE, code=CODE, show=SHOW)
    return document if output_path is None else write_page(document, output_path)
