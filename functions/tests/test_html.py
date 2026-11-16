import json
import re

from functions.html import build_functions_html
from functions.style import ROLES


def _config(document: str) -> dict:
    return json.loads(re.search(r'<script id="pp-config" type="application/json">(.*?)</script>', document, re.S).group(1))


def test_page_inlines_its_scripts_and_has_the_code_popup():
    document = build_functions_html(output_path=None)
    assert "{{" not in document and "window.FunctionsMath" in document and "<script src=" not in document
    dialog = document.split('<dialog class="code-modal"')[1]
    for name in ("function-notation", "denominator-allowed", "even-root-allowed", "log-allowed", "vertical-line-test"):
        assert f'id="pp-code-0-{name}"' in dialog
    assert "mathematics behind every neuron" not in dialog and "_clean" not in dialog  # only the functions


def test_config_carries_solution_and_roles():
    config = _config(build_functions_html({"a": 1, "h": -2, "k": 0, "x0": 2}, "sideways", output_path=None))
    assert config["initial"]["family"] == "sideways" and config["solution"]["is_function"] is False
    assert set(ROLES.values()) <= set(config["theme"]["stage"])
