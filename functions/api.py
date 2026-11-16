"""What this topic publishes to the static API (see general/api).

Frontend usage once deployed:
    PP.call("functions/functions", "solve", 1, 2, 0, 4)              // f(x) = 1 / (x − 2): f(4) = 0.5
    PP.call("functions/functions", "solve", 1, 1, 0, 3, "sqrt")      // f(x) = √(x − 1): domain [1, ∞)
    PP.embed("#el", "functions/functions", { a: 1, h: 2, k: 0, x0: 4 })
"""

from general.api import JSModule, Page, Topic

from core import formula

from . import solver
from .html.functions_page import DEFAULT, MATH_SCRIPTS, build_functions_html


def _build_page(output_path, theme=None):
    return build_functions_html(output_path=output_path, theme=theme)


TOPIC = Topic(
    title="Functions, Domain & Range",
    description="f(x) = a·g(x − h) + k across six families: the domain (no division by zero, even root of a negative or log of a non-positive), the range, f(x₀), and the vertical line test.",
    cards=("A1.9",),  # flashcard: Functions, Domain & Range
    modules=(
        JSModule(
            name="functions",
            global_name="FunctionsMath",
            scripts=MATH_SCRIPTS,
            functions={
                "solve": solver.solve,
                "outputs": solver.outputs,
                "denominator_allowed": formula.denominator_allowed,
                "even_root_allowed": formula.even_root_allowed,
                "log_allowed": formula.log_allowed,
                "vertical_line_test": formula.vertical_line_test,
            },
        ),
    ),
    pages=(
        Page(
            name="functions",
            title="Functions, Domain & Range",
            description="Interactive walkthrough of a function: its domain and range in interval notation, evaluating f(x₀) or finding x₀ outside the domain, and the vertical line test.",
            build=_build_page,
            params=tuple(DEFAULT),
            example=dict(DEFAULT),
        ),
    ),
)
