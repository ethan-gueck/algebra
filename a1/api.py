"""What this topic publishes to the static API (see general/api).

Frontend usage once deployed:
    PP.call("a1/quadratic", "solve", 1, -3, 2)
    PP.call("a1/quadratic_forms", "solve", "vertex", 2, 1, -8)
    PP.embed("#el", "a1/quadratic", { a: 1, b: -3, c: 2 })   // or { a: 2, h: 1, k: -8 }
"""

from general.api import JSModule, Page, Topic

from core import formula

from . import forms, solver
from .html.quadratic_page import MATH_SCRIPTS, PAGE_SCRIPTS, build_quadratic_html


def _build_page(output_path, theme=None):
    return build_quadratic_html(1, -3, 2, output_path, theme=theme)


TOPIC = Topic(
    title="Quadratic Formula & Vertex Form",
    description="Solve ax² + bx + c = 0 (real or complex roots) and write it as a(x − h)² + k: y = x² shifted, stretched and lifted, completing the square, and back.",
    cards=("A1.11", "A1.12"),  # flashcards: Quadratic Formula & Discriminant; Vertex Form of a Quadratic
    modules=(
        JSModule(
            name="quadratic",
            global_name="QuadMath",
            scripts=MATH_SCRIPTS,
            # Browser function -> Python reference implementation (docs + parity tests).
            functions={
                "solve": solver.solve,
                "evaluate": solver.evaluate,
                "discriminant": formula.discriminant,
                "roots": solver.roots,
                "vertex": solver.vertex_point,
            },
        ),
        JSModule(
            name="quadratic_forms",
            global_name="QuadForms",
            scripts=PAGE_SCRIPTS,
            functions={
                "solve": forms.solve,
                "equation": forms.equation,
                "vertex_form": formula.vertex_form,
                "convert_standard_form_to_vertex_form": formula.convert_standard_form_to_vertex_form,
                "convert_vertex_form_to_standard_form": formula.convert_vertex_form_to_standard_form,
                "convert_factored_form_to_vertex_form": formula.convert_factored_form_to_vertex_form,
            },
        ),
    ),
    pages=(
        Page(
            name="quadratic",
            title="Quadratic Formula & Vertex Form",
            description="Interactive walkthrough of a quadratic: the quadratic formula, the vertex form built from y = x², completing the square and expanding back.",
            build=_build_page,
            params=("a", "b", "c"),
            example={"a": 1, "b": -3, "c": 2},
        ),
    ),
)
