import json
import re

from complex_numbers.html import build_complex_numbers_html
from complex_numbers.style import ROLES


def _config(document: str) -> dict:
    return json.loads(re.search(r'<script id="pp-config" type="application/json">(.*?)</script>', document, re.S).group(1))


def test_page_inlines_its_scripts_and_has_the_code_popup():
    document = build_complex_numbers_html(output_path=None)
    assert "{{" not in document and "<script src=" not in document
    assert "window.QuadMath" in document and "window.ComplexMath" in document and "stage-settings" in document
    dialog = document.split('<dialog class="code-modal"')[1].split("</dialog>")[0]
    for name in ("complex-to-real", "complex-standard-form", "complex-conjugate", "complex-modulus"):
        assert f'id="pp-code-0-{name}"' in dialog
    assert "_clean" not in dialog and "quadratic_formula" not in dialog  # only the A2.3 section


def test_config_carries_solution_and_roles():
    config = _config(build_complex_numbers_html(-2, 5, output_path=None))
    assert config["initial"] == {"a": -2, "b": 5}
    assert config["solution"]["texts"]["conjugate"] == "-2 − 5i"
    assert set(ROLES.values()) <= set(config["theme"]["stage"])
