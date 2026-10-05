"""Maps line elements onto the generic stage roles of general.themes."""

from general.themes import Theme, get_theme

ROLES = {
    "line": "primary",
    "point": "point",
    "rise": "highlight",
    "run": "secondary",
    "y_intercept": "warning",
    "x_intercept": "guide",
    "shade": "primary",  # the half-plane of solutions, drawn translucent
    "test": "highlight",  # the test point off the line
}


def palette(theme: str | Theme | None = None) -> dict[str, str]:
    """Element -> CSS colour for the given theme."""
    stage = get_theme(theme).stage
    return {element: stage[role] for element, role in ROLES.items()}
