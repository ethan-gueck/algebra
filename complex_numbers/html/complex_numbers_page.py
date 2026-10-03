"""Interactive page: z = a + bi on the complex plane, its conjugate and its modulus."""

from __future__ import annotations

from pathlib import Path

from a1.html.quadratic_page import MATH_SCRIPTS as QUADRATIC_SCRIPTS
from general.styles import WIDGET
from general.themes import Theme
from general.web import CodeFile, render_page, write_page

from ..solver import solve
from ..style import ROLES

HTML_DIR = Path(__file__).resolve().parent
STATIC = HTML_DIR / "static"
TEMPLATE = HTML_DIR / "templates" / "complex_numbers.html"
DEFAULT_OUTPUT = HTML_DIR.parent / "output" / "complex_numbers.html"
FORMULA = HTML_DIR.parent.parent / "core" / "formula.py"  # the Algebra track's mathematics, one section per neuron

# fmt comes from the quadratic topic's browser module, so it loads first.
MATH_SCRIPTS = (*QUADRATIC_SCRIPTS, STATIC / "complex_numbers_math.js")
BUNDLE = WIDGET.extend(css=[STATIC / "complex_numbers.css"], js=[*MATH_SCRIPTS, STATIC / "complex_numbers.js"])
# The "View the code" popup shows only the concept: the A2.3 section of core/formula.py.
MATH = ("module", "complex_to_real", "complex_standard_form", "complex_conjugate", "complex_modulus")
# The animation's toggles, in the gear menu in the corner of the stage.
SHOW = (("grid", "Grid"), ("labels", "Labels"), ("powers", "Powers of i"), ("parts", "Real and imaginary parts"), ("conjugate", "Conjugate"), ("modulus", "Modulus circle"))
CODE = (CodeFile(FORMULA, "Complex numbers in Python: i² = −1, z = a + bi, the conjugate and the modulus.", only=MATH),)


def build_complex_numbers_html(
    a: float = 3,
    b: float = 4,
    output_path: str | Path | None = DEFAULT_OUTPUT,
    *,
    theme: str | Theme | None = None,
    title: str = "Complex Numbers",
) -> Path | str:
    """Build the page with z = a + bi preloaded; ``output_path=None`` returns the HTML."""
    config = {"initial": {"a": a, "b": b}, "solution": solve(a, b).to_dict(), "roles": ROLES}
    document = render_page(TEMPLATE, title=title, config=config, theme=theme, bundle=BUNDLE, code=CODE, show=SHOW)
    return document if output_path is None else write_page(document, output_path)
