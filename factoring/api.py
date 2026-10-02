"""What this topic publishes to the static API (see general/api).

Frontend usage once deployed:
    PP.call("factoring/factoring", "solve", "standard", 2, 1, -6)
    PP.embed("#el", "factoring/factoring", { a: 2, b: 1, c: -6 })
"""

from core import formula
from general.api import JSModule, Page, Topic

from . import solver
from .html.factoring_page import MATH_SCRIPTS, build_factoring_html


def _build_page(output_path, theme=None):
    return build_factoring_html("standard", 2, 1, -6, output_path, theme=theme)


TOPIC = Topic(
    title="Factoring",
    description="A quadratic in standard, vertex and factored form: the conversions between them, what the discriminant says about factoring, and the factoring itself.",
    cards=("A1.10",),  # flashcard: Factoring
    modules=(
        JSModule(
            name="factoring",
            global_name="FactorMath",
            scripts=MATH_SCRIPTS,
            functions={
                "solve": solver.solve,
                "to_standard": solver.to_standard,
                "factored_form": formula.factored_form,
                "vertex_form": formula.vertex_form,
                "ac_method": formula.ac_method,
                "convert_standard_form_to_factored_form": formula.convert_standard_form_to_factored_form,
                "convert_vertex_form_to_factored_form": formula.convert_vertex_form_to_factored_form,
                "convert_factored_form_to_standard_form": formula.convert_factored_form_to_standard_form,
                "convert_standard_form_to_vertex_form": formula.convert_standard_form_to_vertex_form,
                "convert_vertex_form_to_standard_form": formula.convert_vertex_form_to_standard_form,
                "convert_factored_form_to_vertex_form": formula.convert_factored_form_to_vertex_form,
            },
        ),
    ),
    pages=(
        Page(
            name="factoring",
            title="Factoring",
            description="Interactive walkthrough of the forms of a quadratic, the conversions between them and the factoring process.",
            build=_build_page,
            params=("a", "b", "c"),
            example={"a": 2, "b": 1, "c": -6},
        ),
    ),
)
