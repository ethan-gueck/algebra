"""Maps function / domain / range elements onto the generic stage roles of general.themes."""

from general.themes import Theme, get_theme

ROLES = {
    "graph": "primary",  # the graph of f
    "domain": "highlight",  # the domain, shaded on the x-axis
    "range": "secondary",  # the range, shaded on the y-axis
    "asymptote": "guide",  # asymptotes and the excluded boundary
    "probe": "warning",  # the vertical line x = x₀
    "hit": "point",  # where the vertical line meets the graph
}


def palette(theme: str | Theme | None = None) -> dict[str, str]:
    """Element -> CSS colour for the given theme."""
    stage = get_theme(theme).stage
    return {element: stage[role] for element, role in ROLES.items()}
