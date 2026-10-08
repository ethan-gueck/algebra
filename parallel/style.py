"""Maps parallel / perpendicular elements onto the generic stage roles of general.themes."""

from general.themes import Theme, get_theme

ROLES = {
    "line1": "primary",  # line 1 and its points
    "line2": "secondary",  # line 2 and its points
    "run": "guide",  # the run of each slope triangle
    "rise": "highlight",  # the rise of each slope triangle
    "meet": "point",  # where the lines cross, and the right-angle mark
}


def palette(theme: str | Theme | None = None) -> dict[str, str]:
    """Element -> CSS colour for the given theme."""
    stage = get_theme(theme).stage
    return {element: stage[role] for element, role in ROLES.items()}
