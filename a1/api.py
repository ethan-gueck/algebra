"""What this topic publishes to the static API (see general/api).

Frontend usage once deployed:
    PP.call("a1/quadratic", "solve", 1, -3, 2)
    PP.embed("#el", "a1/quadratic", { a: 1, b: -3, c: 2 })
"""

from general.api import JSModule, Page, Topic

from . import core
from .html.quadratic_page import MATH_SCRIPTS, build_quadratic_html


def _build_page(output_path, theme=None):
    return build_quadratic_html(1, -3, 2, output_path, theme=theme)


TOPIC = Topic(
    title="Quadratic Formula",
    description="Discriminant, roots (real or complex), vertex, axis of symmetry, intercepts and forms of ax² + bx + c.",
    cards=("A1.11",),  # flashcard: Quadratic Formula & Discriminant
    modules=(
        JSModule(
            name="quadratic",
            global_name="QuadMath",
            scripts=MATH_SCRIPTS,
            # Browser function -> Python reference implementation (docs + parity tests).
            functions={
                "solve": core.solve,
                "evaluate": core.evaluate,
                "discriminant": core.discriminant,
                "roots": core.roots,
                "vertex": core.vertex_point,
            },
        ),
    ),
    pages=(
        Page(
            name="quadratic",
            title="Quadratic Formula",
            description="Interactive, Manim-style walkthrough of the quadratic formula.",
            build=_build_page,
            params=("a", "b", "c"),
            example={"a": 1, "b": -3, "c": 2},
        ),
    ),
)
