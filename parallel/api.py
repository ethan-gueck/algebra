"""What this topic publishes to the static API (see general/api).

Frontend usage once deployed:
    PP.call("parallel/parallel", "solve", 0, 1, 2, 5, 0, 3, 4, 1)   // perpendicular: m₁ = 2, m₂ = −0.5
    PP.embed("#el", "parallel/parallel", { x1: 0, y1: 1, x2: 2, y2: 5, x3: 0, y3: 3, x4: 4, y4: 1 })
"""

from general.api import JSModule, Page, Topic

from core import formula

from . import solver
from .html.parallel_page import DEFAULT, MATH_SCRIPTS, build_parallel_html


def _build_page(output_path, theme=None):
    return build_parallel_html(output_path=output_path, theme=theme)


TOPIC = Topic(
    title="Parallel & Perpendicular Lines",
    description="Two lines through two points each: parallel when m₁ = m₂, perpendicular when m₁ · m₂ = −1, with a vertical line handled as the exception.",
    cards=("A1.6",),  # flashcard: Parallel & Perpendicular Lines
    modules=(
        JSModule(
            name="parallel",
            global_name="ParallelMath",
            scripts=MATH_SCRIPTS,
            functions={
                "solve": solver.solve,
                "slope": formula.slope,
                "is_parallel": formula.is_parallel,
                "is_perpendicular": formula.is_perpendicular,
            },
        ),
    ),
    pages=(
        Page(
            name="parallel",
            title="Parallel & Perpendicular Lines",
            description="Interactive check of two lines: their slopes from two points each, and whether they are parallel, perpendicular or neither.",
            build=_build_page,
            params=tuple(DEFAULT),
            example=dict(DEFAULT),
        ),
    ),
)
