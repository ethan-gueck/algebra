import json
import re

import pytest

from a1.html import build_quadratic_html
from a1.style import ROLES


def _config(document: str) -> dict:
    match = re.search(r'<script id="pp-config" type="application/json">(.*?)</script>', document, re.S)
    return json.loads(match.group(1))


def test_page_inlines_its_scripts_and_styles():
    document = build_quadratic_html(1, -3, 2, output_path=None)
    assert "{{" not in document
    assert "window.Manim" in document and "window.QuadMath" in document and "window.PPParams" in document
    assert "<script src=" not in document  # only web fonts load from the network
    assert "--green-800: #0B3D2E" in document  # default theme is the portfolio palette


def test_config_carries_solution_theme_and_roles():
    config = _config(build_quadratic_html(1, 2, 5, output_path=None, video_src="media/q.mp4"))
    assert config["initial"] == {"a": 1, "b": 2, "c": 5}
    assert config["solution"]["discriminant"] == -16
    assert config["video"] == "media/q.mp4"
    assert config["roles"] == ROLES
    assert set(ROLES.values()) <= set(config["theme"]["stage"])


@pytest.mark.parametrize("theme", ["portfolio", "manim"])
def test_theme_selection(theme):
    document = build_quadratic_html(1, -3, 2, output_path=None, theme=theme)
    assert f'data-theme="{theme}"' in document
    assert _config(document)["theme"]["name"] == theme


def test_writes_file(tmp_path):
    path = build_quadratic_html(1, -3, 2, tmp_path / "nested" / "page.html")
    assert path.exists() and path.read_text().startswith("<!doctype html>")


def test_code_popup_shows_the_formula_and_what_the_page_reads_off_it():
    dialog = build_quadratic_html(1, -3, 2, output_path=None).split('<dialog class="code-modal"')[1]
    for name in ("parabola", "discriminant", "quadratic-formula", "x-intercepts", "axis-of-symmetry", "vertex", "y-intercept-of-parabola", "vertex-form", "factored-form"):
        assert f'id="pp-code-0-{name}"' in dialog
    assert "_clean" not in dialog and "quadratic_math.js" not in dialog  # only the concept


def test_title_is_escaped():
    assert "<b>" not in build_quadratic_html(1, 0, 0, output_path=None, title="<b>x</b>")
