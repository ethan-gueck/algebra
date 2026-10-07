"""What this topic publishes to the static API (see general/api).

Frontend usage once deployed:
    PP.call("factoring/factoring", "solve", "standard", 2, 1, -6)
    PP.call("factoring/factoring", "special_products_table", 0.1, 0.3)
    PP.embed("#el", "factoring/factoring", { a: 2, b: 1, c: -6 })
"""

from core import formula
from general.api import JSModule, Page, Topic

from . import solver
from .html.factoring_page import MATH_SCRIPTS, build_factoring_html


def _build_page(output_path, theme=None):
    return build_factoring_html("standard", 2, 1, -6, output_path, theme=theme)


TOPIC = Topic(
    title="Special Products & Factoring",
    description="The special products (a ± b)² and (a + b)(a − b), checked with == and math.isclose and turned into quadratics; a quadratic in standard, vertex and factored form: the conversions between them, what the discriminant says about factoring, and the factoring itself.",
    cards=("A1.9", "A1.10"),  # flashcards: Polynomial Products & Special Products; Factoring
    modules=(
        JSModule(
            name="factoring",
            global_name="FactorMath",
            scripts=MATH_SCRIPTS,
            functions={
                "solve": solver.solve,
                "to_standard": solver.to_standard,
                "special_products_table": solver.special_products_table,
                "polynomial_products": formula.polynomial_products,
                "special_products": formula.special_products,
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
            title="Special Products & Factoring",
            description="The special products and the quadratics they make, then an interactive walkthrough of the forms of a quadratic, the conversions between them and the factoring process.",
            build=_build_page,
            params=("a", "b", "c"),
            example={"a": 2, "b": 1, "c": -6},
        ),
    ),
)
