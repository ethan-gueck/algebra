"""Maps variation elements onto the generic stage roles of general.themes."""

from general.themes import Theme, get_theme

ROLES = {
    "curve": "primary",  # y = kx or y = k / x
    "known": "point",  # the known point (x₁, y₁) that fixes k
    "new": "highlight",  # the predicted point (x₂, y₂)
    "invariant": "secondary",  # the triangle (y / x = k) or rectangle (xy = k) at each point
    "guide": "guide",
}


def palette(theme: str | Theme | None = None) -> dict[str, str]:
    """Element -> CSS colour for the given theme."""
    stage = get_theme(theme).stage
    return {element: stage[role] for element, role in ROLES.items()}
