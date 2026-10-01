"""Maps line elements onto the generic stage roles of general.themes."""

from general.themes import Theme, get_theme

ROLES = {
    "line": "primary",
    "point": "point",
    "rise": "highlight",
    "run": "secondary",
    "y_intercept": "warning",
    "x_intercept": "guide",
}


def palette(theme: str | Theme | None = None) -> dict[str, str]:
    """Element -> CSS colour for the given theme."""
    stage = get_theme(theme).stage
    return {element: stage[role] for element, role in ROLES.items()}
