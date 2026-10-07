"""What this topic publishes to the static API (see general/api).

Frontend usage once deployed:
    PP.call("real_numbers/real_numbers", "order_of_operations", "3 + 4 × 2")
    PP.call("real_numbers/real_numbers", "properties", "0.1", "0.2", "0.3")
    PP.call("real_numbers/real_numbers", "exponent_rules", "0.1", "2", "5")
    PP.call("real_numbers/real_numbers", "radicals", "8", "18", "2", "3")
    PP.call("real_numbers/real_numbers", "percent_change", "80", "120")
"""

from general.api import JSModule, Page, Topic

from . import solver
from .html.real_numbers_page import MATH_SCRIPTS, build_real_numbers_html


def _build_page(output_path, theme=None):
    return build_real_numbers_html(output_path, theme=theme)


TOPIC = Topic(
    title="Real Numbers, Exponents, Radicals & Ratios",
    description="Commutative, associative, distributive, identity and inverse properties, the exponent rules and rational exponents checked exactly and in floating point; PEMDAS one step at a time; ratios, proportions and percent change; and how float rounding produced impossible solar altitudes.",
    cards=("A1.1", "A1.2", "A1.3", "A1.14"),  # flashcards: Properties of Real Numbers & Order of Operations; Exponent Rules; Radicals & Rational Exponents; Ratios, Proportions & Percent Change
    modules=(
        JSModule(
            name="real_numbers",
            global_name="RealMath",
            scripts=MATH_SCRIPTS,
            functions={
                "properties": solver.properties,
                "order_of_operations": solver.order_of_operations,
                "sum_two_ways": solver.sum_two_ways,
                "to_float": solver.to_float,
                "altitude_deg": solver.altitude_deg,
                "guarded_altitude_deg": solver.guarded_altitude_deg,
                "exponent_rules": solver.exponent_rules,
                "radicals": solver.radicals,
                "proportion": solver.proportion,
                "percent_change": solver.percent_change,
            },
        ),
    ),
    pages=(
        Page(
            name="properties",
            title="Real Numbers, Exponents, Radicals & Ratios",
            description="Properties explorer, PEMDAS stepper, a real case where float addition wasn't associative, exponent rules, radicals and rational exponents, and ratios, proportions and percent change.",
            build=_build_page,
            params=("a", "b", "c"),
            example={"a": 0.1, "b": 0.2, "c": 0.3},
        ),
    ),
)
