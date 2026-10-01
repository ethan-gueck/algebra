"""Maps quadratic elements onto the generic stage roles of general.themes.

Colours themselves live in the theme (default: ethan-gueck.github.io's
palette); this file only decides which role each element plays, so the
Manim scene and the HTML page always agree.
"""

from general.themes import Theme, get_theme

ROLES = {
    "curve": "primary",
    "roots": "highlight",
    "vertex": "point",
    "y_intercept": "secondary",
    "symmetry": "guide",
    "discriminant": "warning",
}


def palette(theme: str | Theme | None = None) -> dict[str, str]:
    """Element -> CSS colour for the given theme."""
    stage = get_theme(theme).stage
    return {element: stage[role] for element, role in ROLES.items()}
