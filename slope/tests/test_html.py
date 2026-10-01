import json
import re

from slope.html import build_slope_html
from slope.style import ROLES


def _config(document: str) -> dict:
    return json.loads(re.search(r'<script id="pp-config" type="application/json">(.*?)</script>', document, re.S).group(1))


def test_page_inlines_its_scripts_and_has_the_code_popup():
    document = build_slope_html(output_path=None)
    assert "{{" not in document and "window.SlopeMath" in document and "window.Manim" in document
    assert "<script src=" not in document
    dialog = document.split('<dialog class="code-modal"')[1]
    for name in ("rise", "run", "slope", "y-intercept", "x-intercept", "angle-of-inclination", "slope-intercept-form", "point-slope-form", "standard-form"):
        assert f'id="pp-code-0-{name}"' in dialog
    assert "_clean" not in dialog and "_coef" not in dialog  # only the concept


def test_config_carries_solution_and_roles():
    config = _config(build_slope_html(-2, 4, 3, -1, output_path=None))
    assert config["initial"] == {"x1": -2, "y1": 4, "x2": 3, "y2": -1}
    assert config["solution"]["slope"] == -1
    assert set(ROLES.values()) <= set(config["theme"]["stage"])
