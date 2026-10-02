import json
import re

from vertex_form.html import build_vertex_form_html
from vertex_form.style import ROLES


def _config(document: str) -> dict:
    return json.loads(re.search(r'<script id="pp-config" type="application/json">(.*?)</script>', document, re.S).group(1))


def test_page_inlines_its_scripts_and_has_the_code_popup():
    document = build_vertex_form_html(output_path=None)
    assert "{{" not in document and "<script src=" not in document
    assert "window.QuadMath" in document and "window.VertexMath" in document
    assert 'data-show="trail"' in document and "stage-settings" in document
    dialog = document.split('<dialog class="code-modal"')[1].split("</dialog>")[0]
    for name in ("vertex-form", "convert-standard-form-to-vertex-form", "convert-vertex-form-to-standard-form", "convert-factored-form-to-vertex-form"):
        assert f'id="pp-code-0-{name}"' in dialog
    assert "_clean" not in dialog and "A2.15 Conic Sections" not in dialog  # only the concept: no solver, no empty sections


def test_config_carries_solution_and_roles():
    config = _config(build_vertex_form_html("standard", 1, -6, 5, output_path=None))
    assert config["initial"] == {"form": "standard", "a": 1, "p": -6, "q": 5}
    assert config["solution"]["equation"] == "y = (x - 3)² - 4"
    assert set(ROLES.values()) <= set(config["theme"]["stage"])
