"""What this topic publishes to the static API (see general/api).

Frontend usage once deployed:
    PP.call("vertex_form/vertex_form", "solve", "vertex", 2, 1, -8)
    PP.embed("#el", "vertex_form/vertex_form", { a: 2, h: 1, k: -8 })
"""

from core import formula
from general.api import JSModule, Page, Topic

from . import solver
from .html.vertex_form_page import MATH_SCRIPTS, build_vertex_form_html


def _build_page(output_path, theme=None):
    return build_vertex_form_html("vertex", 2, 1, -8, output_path, theme=theme)


TOPIC = Topic(
    title="Vertex Form",
    description="y = a(x − h)² + k: the parabola y = x² shifted by h, stretched by a and lifted by k, completing the square, and converting back to standard form.",
    cards=("A1.12",),  # flashcard: Vertex Form of a Quadratic
    modules=(
        JSModule(
            name="vertex_form",
            global_name="VertexMath",
            scripts=MATH_SCRIPTS,
            functions={
                "solve": solver.solve,
                "equation": solver.equation,
                "vertex_form": formula.vertex_form,
                "convert_standard_form_to_vertex_form": formula.convert_standard_form_to_vertex_form,
                "convert_vertex_form_to_standard_form": formula.convert_vertex_form_to_standard_form,
                "convert_factored_form_to_vertex_form": formula.convert_factored_form_to_vertex_form,
            },
        ),
    ),
    pages=(
        Page(
            name="vertex_form",
            title="Vertex Form",
            description="Interactive walkthrough of y = a(x − h)² + k: the three transformations of y = x², completing the square and expanding back.",
            build=_build_page,
            params=("a", "h", "k"),
            example={"a": 2, "h": 1, "k": -8},
        ),
    ),
)
