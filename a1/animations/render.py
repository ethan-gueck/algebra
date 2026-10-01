"""Render the quadratic scene (wraps general.animations.render_scene)."""

from __future__ import annotations

from pathlib import Path

from general.animations import render_scene, require_manim

DEFAULT_MEDIA_DIR = Path(__file__).resolve().parents[1] / "output" / "media"


def render_quadratic(a: float = 1, b: float = -3, c: float = 2, *, theme: str | None = None, **kwargs) -> Path:
    """Render the quadratic scene for (a, b, c) and return the video path.

    ``kwargs`` are split between show-toggles for the scene (grid, symmetry,
    vertex, yint, roots, labels) and render_scene options (quality, fmt,
    preview, file_name, media_dir).
    """
    require_manim()
    from .quadratic_scene import SHOW_OPTIONS, make_quadratic_scene

    show = {key: kwargs.pop(key) for key in list(kwargs) if key in SHOW_OPTIONS}
    kwargs.setdefault("media_dir", DEFAULT_MEDIA_DIR)
    kwargs.setdefault("file_name", f"quadratic_{a:g}_{b:g}_{c:g}{'_' + theme if theme else ''}".replace(".", "p"))
    return render_scene(make_quadratic_scene(a, b, c, theme=theme, **show), **kwargs)
