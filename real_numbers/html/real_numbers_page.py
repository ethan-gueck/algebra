"""Interactive page: properties of real numbers, order of operations, exponent rules, radicals, ratios and percent change, and floating point."""

from __future__ import annotations

from pathlib import Path

from general.styles import BASE
from general.themes import Theme
from general.web import CodeFile, render_page, write_page

from ..solver import exponent_rules, order_of_operations, percent_change, properties, proportion, radicals, sum_two_ways

HTML_DIR = Path(__file__).resolve().parent
STATIC = HTML_DIR / "static"
TEMPLATE = HTML_DIR / "templates" / "real_numbers.html"
DEFAULT_OUTPUT = HTML_DIR.parent / "output" / "properties.html"

MATH_SCRIPTS = (STATIC / "real_numbers_math.js",)
BUNDLE = BASE.extend(
    css=("components/controls.css", "components/results.css", "components/steps.css", STATIC / "real_numbers.css"),
    js=("params.js", *MATH_SCRIPTS, STATIC / "real_numbers.js"),
)
# The "View the code" popup shows only the concept: this page's functions from core/formula.py.
FORMULA = HTML_DIR.parent.parent / "core" / "formula.py"  # the Algebra track's mathematics, one section per neuron
MATH = ("module", "commutative_addition", "commutative_multiplication", "associative_addition", "associative_multiplication", "distributive",
        "additive_identity", "multiplicative_identity", "additive_inverse", "multiplicative_inverse", "sine_of_solar_altitude", "solar_altitude", "PRECEDENCE",
        "term_multiplication_exponent", "term_division_with_exponent", "term_with_exponent_raised_by_exponent", "term_with_exponent_equal_to_zero",
        "term_with_negative_exponent", "term_with_exponent_divided_by_exponent", "root_term_multiplication",
        "ratio", "proportion", "percent_change")
CODE = (CodeFile(FORMULA, "Each property as a Python function returning its two sides, the PEMDAS ranking, each exponent and radical rule as a check that its sides are equal, and ratios and percent change. The page runs these on exact numbers and on floats.", only=MATH),)
DEFAULTS = {"a": "0.1", "b": "0.2", "c": "0.3", "expr": "3 + 4 × 2 ÷ (1 − 5)^2", "terms": ["0.1", "0.3", "-0.4"],
            "exponents": ["0.1", "2", "5"], "radicals": ["8", "18", "2", "3"], "ratio": ["0.1", "0.3", "1", "3"], "percent": ["80", "120"]}


def build_real_numbers_html(
    output_path: str | Path | None = DEFAULT_OUTPUT,
    *,
    theme: str | Theme | None = None,
    title: str = "Real Numbers, Exponents, Radicals & Ratios",
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
            "exponents": exponent_rules(*values["exponents"]),
            "radicals": radicals(*values["radicals"]),
            "ratio": proportion(*values["ratio"]),
            "percent": percent_change(*values["percent"]),
        },
    }
    document = render_page(TEMPLATE, title=title, config=config, theme=theme, bundle=BUNDLE, code=CODE)
    return document if output_path is None else write_page(document, output_path)
