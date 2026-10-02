"""What this topic publishes to the static API (see general/api).

Frontend usage once deployed:
    PP.call("lines/lines", "solve", 1, 3, 2)
    PP.embed("#el", "lines/lines", { x1: 1, y1: 3, m: 2 })
"""

from general.api import JSModule, Page, Topic

from core import formula

from . import solver
from .html.lines_page import MATH_SCRIPTS, build_lines_html


def _build_page(output_path, theme=None):
    return build_lines_html(1, 3, 2, output_path, theme=theme)


TOPIC = Topic(
    title="Equations of a Line",
    description="One line written three ways: slope-intercept y = mx + b, point-slope y − y₁ = m(x − x₁) and standard Ax + By = C, with the conversions between them.",
    cards=("A1.5",),  # flashcard: Equations of a Line
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
            },
        ),
    ),
    pages=(
        Page(
            name="lines",
            title="Equations of a Line",
            description="Interactive walkthrough of the three forms of a line and how to move between them.",
            build=_build_page,
            params=("x1", "y1", "m"),
            example={"x1": 1, "y1": 3, "m": 2},
        ),
    ),
)
