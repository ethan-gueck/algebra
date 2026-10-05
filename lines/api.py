"""What this topic publishes to the static API (see general/api).

Frontend usage once deployed:
    PP.call("lines/lines", "solve", 1, 3, 2)
    PP.call("lines/lines", "solve", 1, 3, 2, ">")   // y > 2x + 1
    PP.embed("#el", "lines/lines", { x1: 1, y1: 3, m: 2 })
"""

from general.api import JSModule, Page, Topic

from core import formula

from . import solver
from .html.lines_page import MATH_SCRIPTS, build_lines_html


def _build_page(output_path, theme=None):
    return build_lines_html(1, 3, 2, output_path, theme=theme)


TOPIC = Topic(
    title="Equations of a Line & Linear Inequalities",
    description="One line written three ways (y = mx + b, y − y₁ = m(x − x₁), Ax + By = C) and the inequalities it bounds: y < mx + b shaded, with the sign flipping when you divide by a negative.",
    cards=("A1.5", "A1.15"),  # flashcards: Equations of a Line; Linear Inequalities
    modules=(
        JSModule(
            name="lines",
            global_name="LineMath",
            scripts=MATH_SCRIPTS,
            functions={
                "solve": solver.solve,
                "linear_form": formula.linear_form,
                "point_form_slope": formula.point_form_slope,
                "standard_form_for_linear_form": formula.standard_form_for_linear_form,
                "y_intercept": formula.y_intercept,
                "x_intercept_of_linear_form": formula.x_intercept_of_linear_form,
                "linear_inequality": formula.linear_inequality,
            },
        ),
    ),
    pages=(
        Page(
            name="lines",
            title="Equations of a Line & Linear Inequalities",
            description="Interactive walkthrough of the three forms of a line, how to move between them, and the half-plane each inequality shades.",
            build=_build_page,
            params=("x1", "y1", "m"),
            example={"x1": 1, "y1": 3, "m": 2},
        ),
    ),
)
