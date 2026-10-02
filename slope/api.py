"""What this topic publishes to the static API (see general/api).

Frontend usage once deployed:
    PP.call("slope/slope", "solve", 1, 1, 4, 3)
    PP.embed("#el", "slope/slope", { x1: 1, y1: 1, x2: 4, y2: 3 })
"""

from general.api import JSModule, Page, Topic

from . import solver
from .html.slope_page import MATH_SCRIPTS, build_slope_html


def _build_page(output_path, theme=None):
    return build_slope_html(1, 1, 4, 3, output_path, theme=theme)


TOPIC = Topic(
    title="Slope",
    description="Rise over run between two points, the angle of the line, its intercepts, and the line in slope-intercept, point-slope and standard form.",
    cards=("A1.4",),  # flashcard: Slope
    modules=(
        JSModule(
            name="slope",
            global_name="SlopeMath",
            scripts=MATH_SCRIPTS,
            functions={
                "solve": solver.solve,
                "slope": solver.slope,
                "rise": solver.rise,
                "run": solver.run,
                "y_intercept": solver.y_intercept,
                "x_intercept": solver.x_intercept,
            },
        ),
    ),
    pages=(
        Page(
            name="slope",
            title="Slope",
            description="Interactive, Manim-style walkthrough of rise over run.",
            build=_build_page,
            params=("x1", "y1", "x2", "y2"),
            example={"x1": 1, "y1": 1, "x2": 4, "y2": 3},
        ),
    ),
)
