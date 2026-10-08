import json
import re

from parallel.html import build_parallel_html
from parallel.style import ROLES


def _config(document: str) -> dict:
    return json.loads(re.search(r'<script id="pp-config" type="application/json">(.*?)</script>', document, re.S).group(1))


def test_page_inlines_its_scripts_and_has_the_code_popup():
    document = build_parallel_html(output_path=None)
    assert "{{" not in document and "window.ParallelMath" in document and "<script src=" not in document
    dialog = document.split('<dialog class="code-modal"')[1]
    for name in ("slope", "is-parallel", "is-perpendicular"):
        assert f'id="pp-code-0-{name}"' in dialog
    assert "mathematics behind every neuron" not in dialog and "_clean" not in dialog  # only the functions


def test_config_carries_solution_and_roles():
    config = _config(build_parallel_html({"x1": 0, "y1": 1, "x2": 1, "y2": 3, "x3": 0, "y3": -3, "x4": 2, "y4": 1}, output_path=None))
    assert config["solution"]["relation"] == "parallel"
    assert set(ROLES.values()) <= set(config["theme"]["stage"])
