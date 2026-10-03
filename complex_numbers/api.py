"""What this topic publishes to the static API (see general/api).

Frontend usage once deployed:
    PP.call("complex_numbers/complex_numbers", "solve", 3, 4)
    PP.embed("#el", "complex_numbers/complex_numbers", { a: 3, b: 4 })
"""

from core import formula
from general.api import JSModule, Page, Topic

from . import solver
from .html.complex_numbers_page import MATH_SCRIPTS, build_complex_numbers_html


def _build_page(output_path, theme=None):
    return build_complex_numbers_html(3, 4, output_path, theme=theme)


TOPIC = Topic(
    title="Complex Numbers",
    description="z = a + bi on the complex plane: i² = −1, the real and imaginary parts, the conjugate z̄ = a − bi and the modulus |z| = √(a² + b²).",
    cards=("A2.3",),  # flashcard: Complex Numbers
    modules=(
        JSModule(
            name="complex_numbers",
            global_name="ComplexMath",
            scripts=MATH_SCRIPTS,
            functions={
                "solve": solver.solve,
                "text": solver.text,
                "complex_to_real": formula.complex_to_real,
                "complex_standard_form": formula.complex_standard_form,
                "complex_conjugate": formula.complex_conjugate,
                "complex_modulus": formula.complex_modulus,
            },
        ),
    ),
    pages=(
        Page(
            name="complex_numbers",
            title="Complex Numbers",
            description="Interactive walkthrough of z = a + bi on the complex plane: i² = −1, the conjugate and the modulus.",
            build=_build_page,
            params=("a", "b"),
            example={"a": 3, "b": 4},
        ),
    ),
)
