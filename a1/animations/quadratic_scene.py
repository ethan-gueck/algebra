"""Manim scene: solving ax² + bx + c = 0 with the quadratic formula.

Render from Python (preferred):
    from a1.animations import render_quadratic
    render_quadratic(1, -3, 2, theme="portfolio")

Or with the manim CLI, passing values through the environment:
    A1_A=1 A1_B=-3 A1_C=2 A1_THEME=manim manim -pql a1/animations/quadratic_scene.py QuadraticScene
"""

from __future__ import annotations

import os

if __package__ in (None, ""):
    # Loaded as a bare file by the `manim` CLI: make the topic package importable
    # so the relative imports below resolve (works for any copied topic folder).
    import sys
    from pathlib import Path

    _topic_dir = Path(__file__).resolve().parents[1]
    sys.path.insert(0, str(_topic_dir.parent))
    __package__ = f"{_topic_dir.name}.animations"

from manim import DL, DOWN, DR, LEFT, RIGHT, UL, UP, UR, Create, DashedLine, Dot, FadeIn, Flash, GrowFromCenter, VGroup, Write

from ..solver import evaluate, fmt, solve  # importing the topic package also puts general/ on sys.path
from ..style import ROLES

from general.animations.manim_base import ThemedScene  # noqa: E402  (must follow the topic import)

SHOW_OPTIONS = ("grid", "symmetry", "vertex", "yint", "roots", "labels")


def _complex(z: complex) -> str:
    if z.imag == 0:
        return fmt(z.real)
    return f"{fmt(z.real)} {'-' if z.imag < 0 else '+'} {fmt(abs(z.imag))}i"


class QuadraticScene(ThemedScene):
    """Plots the parabola, then reveals Δ, symmetry, vertex, y-intercept and roots.

    Configure by subclassing (see :func:`make_quadratic_scene`) or via the
    A1_A / A1_B / A1_C / A1_THEME environment variables with the manim CLI.
    """

    a = float(os.environ.get("A1_A", 1))
    b = float(os.environ.get("A1_B", -3))
    c = float(os.environ.get("A1_C", 2))
    theme = os.environ.get("A1_THEME") or None
    show = dict.fromkeys(SHOW_OPTIONS, True)

    def role(self, element: str) -> str:
        """Theme stage role for one of this topic's elements (see a1/style.py)."""
        return ROLES[element]

    def construct(self):
        sol = solve(self.a, self.b, self.c)
        view = sol.window
        show = self.show
        h, k = sol.vertex

        formula = self.math(r"x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}", "x = (−b ± √(b² − 4ac)) / 2a").to_corner(UL)
        equation = self.text(sol.standard_form, self.role("curve"), 28).next_to(formula, DOWN, buff=0.25).align_to(formula, LEFT)
        self.play(Write(formula))
        self.play(FadeIn(equation, shift=UP * 0.2))

        frame = self.axes(view, grid=show["grid"]).to_edge(DOWN, buff=0.35)
        axes = frame.axes
        self.play(Create(frame), run_time=1.5)

        graph = axes.plot(
            lambda x: evaluate(self.a, self.b, self.c, x),
            x_range=[view.x_min, view.x_max],
            color=self.color(self.role("curve")),
            stroke_width=5,
        )
        self.play(Create(graph), run_time=2)

        disc = self.text(f"Δ = b² − 4ac = {fmt(sol.discriminant)}", self.role("discriminant"), 28)
        nature = self.text(sol.root_nature, self.role("discriminant"), 22)
        info = VGroup(disc, nature).arrange(DOWN, aligned_edge=RIGHT, buff=0.15).to_corner(UR)
        self.play(Write(disc))
        self.play(FadeIn(nature, shift=UP * 0.2))

        if show["symmetry"]:
            guide_color, guide_opacity = self.style.manim_color(self.role("symmetry"))
            line = DashedLine(axes.c2p(h, view.y_min), axes.c2p(h, view.y_max), color=guide_color, stroke_opacity=guide_opacity)
            self.play(Create(line))
            if show["labels"]:
                self.play(FadeIn(self.text(f"x = {fmt(h)}", self.role("symmetry"), 20).next_to(line.get_end(), DR, buff=0.1)))

        if show["vertex"]:
            # Extra buffer so the vertex label clears root labels when the vertex sits near the x-axis.
            self._mark(axes, h, k, "vertex", f"vertex ({fmt(h)}, {fmt(k)})", DOWN if sol.direction == "up" else UP, buff=0.5)

        if show["yint"]:
            self._mark(axes, 0, self.c, "y_intercept", f"(0, {fmt(self.c)})", UR)

        if show["roots"]:
            if len(sol.x_intercepts) == 2:
                # Push each root label outward, away from the vertex label between them.
                for (x, _), direction in zip(sol.x_intercepts, (DL, DR)):
                    self._mark(axes, x, 0, "roots", f"x = {fmt(x)}", direction)
            elif sol.x_intercepts:
                # A repeated root sits on the vertex: label it on the opposite side.
                x = sol.x_intercepts[0][0]
                self._mark(axes, x, 0, "roots", f"x = {fmt(x)}", UL if sol.direction == "up" else DL)
            else:
                note = self.text(f"No real roots: x = {', '.join(_complex(r) for r in sol.roots)}", self.role("roots"), 24)
                self.play(FadeIn(note.next_to(info, DOWN, buff=0.3).align_to(info, RIGHT), shift=UP * 0.2))

        self.wait(2)

    def _mark(self, axes, x, y, element, text, direction, buff=0.15):
        color = self.color(self.role(element))
        dot = Dot(axes.c2p(x, y), color=color, radius=0.09)
        self.play(GrowFromCenter(dot), Flash(dot, color=color, flash_radius=0.35), run_time=0.8)
        if self.show["labels"]:
            label = self.plate(self.text(text, self.role(element), 22)).next_to(dot, direction, buff=buff)
            self.play(FadeIn(label, shift=-direction * 0.15), run_time=0.5)


def make_quadratic_scene(a: float, b: float, c: float, *, theme: str | None = None, **show: bool) -> type[QuadraticScene]:
    """A QuadraticScene subclass preset to (a, b, c); ``show`` toggles overlays.

    Example: ``make_quadratic_scene(1, 2, 5, theme="manim", grid=False)``.
    """
    unknown = set(show) - set(SHOW_OPTIONS)
    if unknown:
        raise ValueError(f"Unknown show option(s) {sorted(unknown)}; expected {SHOW_OPTIONS}")
    solve(a, b, c)  # validate early, before Manim spins up
    return type(
        "QuadraticScene",
        (QuadraticScene,),
        {"a": float(a), "b": float(b), "c": float(c), "theme": theme, "show": {**QuadraticScene.show, **show}},
    )
