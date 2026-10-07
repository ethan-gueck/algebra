"""What this topic publishes to the static API (see general/api).

Frontend usage once deployed:
    PP.call("variation/variation", "solve", 2, 6, 4)              // y = 3x: y₂ = 12
    PP.call("variation/variation", "solve", 2, 6, 4, "inverse")   // y = 12 / x: y₂ = 3
    PP.embed("#el", "variation/variation", { x1: 2, y1: 6, x2: 4 })
"""

from general.api import JSModule, Page, Topic

from core import formula

from . import solver
from .html.variation_page import MATH_SCRIPTS, build_variation_html


def _build_page(output_path, theme=None):
    return build_variation_html(2, 6, 4, output_path, theme=theme)


TOPIC = Topic(
    title="Direct & Inverse Variation",
    description="y = kx and y = k / x: find k from one known point, predict y at a new x, and see y / x (direct) or xy (inverse) stay equal to k.",
    cards=("A1.13",),  # flashcard: Direct & Inverse Variation
    modules=(
        JSModule(
            name="variation",
            global_name="VariationMath",
            scripts=MATH_SCRIPTS,
            functions={
                "solve": solver.solve,
                "direct_variation": formula.direct_variation,
                "indirect_variation": formula.indirect_variation,
            },
        ),
    ),
    pages=(
        Page(
            name="variation",
            title="Direct & Inverse Variation",
            description="Interactive walkthrough of y = kx and y = k / x: the constant of variation from one point, the prediction at another, and the line or hyperbola they lie on.",
            build=_build_page,
            params=("x1", "y1", "x2"),
            example={"x1": 2, "y1": 6, "x2": 4},
        ),
    ),
)
