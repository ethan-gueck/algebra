import json
import re

from variation.html import build_variation_html
from variation.style import ROLES


def _config(document: str) -> dict:
    return json.loads(re.search(r'<script id="pp-config" type="application/json">(.*?)</script>', document, re.S).group(1))


def test_page_inlines_its_scripts_and_has_the_code_popup():
    document = build_variation_html(output_path=None)
    assert "{{" not in document and "window.VariationMath" in document and "<script src=" not in document
    dialog = document.split('<dialog class="code-modal"')[1]
    for name in ("direct-variation", "indirect-variation"):
        assert f'id="pp-code-0-{name}"' in dialog
    assert "_clean" not in dialog and "plot_window" not in dialog  # only the concept


def test_config_carries_solution_and_roles():
    config = _config(build_variation_html(2, 6, 4, output_path=None, kind="inverse"))
    assert config["initial"] == {"x1": 2, "y1": 6, "x2": 4, "kind": "inverse"}
    assert config["solution"]["equation"] == "y = 12 / x" and config["solution"]["y2"] == 3
    assert set(ROLES.values()) <= set(config["theme"]["stage"])
