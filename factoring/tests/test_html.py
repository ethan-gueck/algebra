import json
import re

from factoring.html import build_factoring_html
from factoring.style import ROLES


def _config(document: str) -> dict:
    return json.loads(re.search(r'<script id="pp-config" type="application/json">(.*?)</script>', document, re.S).group(1))


def test_page_inlines_its_scripts_and_has_the_code_popup():
    document = build_factoring_html(output_path=None)
    assert "{{" not in document and "<script src=" not in document
    assert "window.QuadMath" in document and "window.FactorMath" in document
    dialog = document.split('<dialog class="code-modal"')[1].split("</dialog>")[0]
    for name in ("convert-standard-form-to-factored-form", "convert-vertex-form-to-factored-form", "ac-method", "convert-standard-form-to-vertex-form"):
        assert f'id="pp-code-0-{name}"' in dialog
    assert "_clean" not in dialog and "A2.15 Conic Sections" not in dialog  # only the concept: no solver, no empty sections


def test_config_carries_solution_and_roles():
    config = _config(build_factoring_html("vertex", 1, 1.5, -0.25, output_path=None))
    assert config["initial"] == {"form": "vertex", "a": 1, "p": 1.5, "q": -0.25}
    assert config["solution"]["forms"]["standard"] == "y = x² - 3x + 2"
    assert set(ROLES.values()) <= set(config["theme"]["stage"])
