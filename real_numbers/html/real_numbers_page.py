"""Interactive page: properties of real numbers, order of operations, and floating point."""

from __future__ import annotations

from pathlib import Path

from general.styles import BASE
from general.themes import Theme
from general.web import CodeFile, render_page, write_page

from ..core import order_of_operations, properties, sum_two_ways

HTML_DIR = Path(__file__).resolve().parent
STATIC = HTML_DIR / "static"
TEMPLATE = HTML_DIR / "templates" / "real_numbers.html"
DEFAULT_OUTPUT = HTML_DIR.parent / "output" / "properties.html"

MATH_SCRIPTS = (STATIC / "real_numbers_math.js",)
BUNDLE = BASE.extend(
    css=("components/controls.css", "components/results.css", "components/steps.css", STATIC / "real_numbers.css"),
    js=("params.js", *MATH_SCRIPTS, STATIC / "real_numbers.js"),
)
# The "View the code" popup shows only the concept: core/formula.py, the math as written.
CODE = (CodeFile(HTML_DIR.parent / "core" / "formula.py", "Each property as a Python function returning its two sides, and the PEMDAS ranking. The page runs these same functions on exact numbers and on floats."),)
DEFAULTS = {"a": "0.1", "b": "0.2", "c": "0.3", "expr": "3 + 4 × 2 ÷ (1 − 5)^2", "terms": ["0.1", "0.3", "-0.4"]}


def build_real_numbers_html(
    output_path: str | Path | None = DEFAULT_OUTPUT,
    *,
    theme: str | Theme | None = None,
    title: str = "Properties of Real Numbers",
    initial: dict | None = None,
) -> Path | str:
    """Build the page; ``initial`` overrides DEFAULTS. ``output_path=None`` returns the HTML."""
    values = {**DEFAULTS, **(initial or {})}
    config = {
        "initial": values,
        "solution": {
            "properties": properties(values["a"], values["b"], values["c"]),
            "order": order_of_operations(values["expr"]),
            "sum": sum_two_ways(*values["terms"]),
        },
    }
    document = render_page(TEMPLATE, title=title, config=config, theme=theme, bundle=BUNDLE, code=CODE)
    return document if output_path is None else write_page(document, output_path)
