import json
import re

from lines.html import build_lines_html
from lines.style import ROLES


def _config(document: str) -> dict:
    return json.loads(re.search(r'<script id="pp-config" type="application/json">(.*?)</script>', document, re.S).group(1))


def test_page_inlines_its_scripts_and_has_the_code_popup():
    document = build_lines_html(output_path=None)
    assert "{{" not in document and "window.LineMath" in document and "<script src=" not in document
    dialog = document.split('<dialog class="code-modal"')[1]
    for name in ("linear-form", "point-form-slope", "standard-form-for-linear-form"):
        assert f'id="pp-code-0-{name}"' in dialog
    assert "_clean" not in dialog and "Fraction" not in dialog  # only the concept


def test_config_carries_solution_and_roles():
    config = _config(build_lines_html(2, -1, 0.75, output_path=None))
    assert config["initial"] == {"x1": 2, "y1": -1, "m": 0.75}
    assert config["solution"]["standard_form"] == "3x - 4y = 10"
    assert set(ROLES.values()) <= set(config["theme"]["stage"])
