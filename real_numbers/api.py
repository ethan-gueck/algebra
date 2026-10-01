"""What this topic publishes to the static API (see general/api).

Frontend usage once deployed:
    PP.call("real_numbers/real_numbers", "order_of_operations", "3 + 4 × 2")
    PP.call("real_numbers/real_numbers", "properties", "0.1", "0.2", "0.3")
"""

from general.api import JSModule, Page, Topic

from . import core
from .html.real_numbers_page import MATH_SCRIPTS, build_real_numbers_html


def _build_page(output_path, theme=None):
    return build_real_numbers_html(output_path, theme=theme)


TOPIC = Topic(
    title="Properties of Real Numbers & Order of Operations",
    description="Commutative, associative, distributive, identity and inverse properties checked exactly and in floating point; PEMDAS one step at a time; and how float rounding produced impossible solar altitudes.",
    cards=("A1.1",),  # flashcard: Properties of Real Numbers & Order of Operations
    modules=(
        JSModule(
            name="real_numbers",
            global_name="RealMath",
            scripts=MATH_SCRIPTS,
            functions={
                "properties": core.properties,
                "order_of_operations": core.order_of_operations,
                "sum_two_ways": core.sum_two_ways,
                "to_float": core.to_float,
                "altitude_deg": core.altitude_deg,
                "guarded_altitude_deg": core.guarded_altitude_deg,
            },
        ),
    ),
    pages=(
        Page(
            name="properties",
            title="Properties of Real Numbers",
            description="Properties explorer, PEMDAS stepper, and a real case where float addition wasn't associative.",
            build=_build_page,
            params=("a", "b", "c"),
            example={"a": 0.1, "b": 0.2, "c": 0.3},
        ),
    ),
)
