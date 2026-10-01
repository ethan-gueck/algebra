import json
import re

from real_numbers.html import build_real_numbers_html


def _config(document: str) -> dict:
    return json.loads(re.search(r'<script id="pp-config" type="application/json">(.*?)</script>', document, re.S).group(1))


def test_page_inlines_its_scripts_and_has_the_code_popup():
    document = build_real_numbers_html(output_path=None)
    assert "{{" not in document and "window.RealMath" in document and "<script src=" not in document
    dialog = document.split('<dialog class="code-modal"')[1]
    for name in ("distributive", "associative-addition", "solar-altitude", "sine-of-solar-altitude", "precedence"):
        assert f'id="pp-code-0-{name}"' in dialog
    assert "Fraction" not in dialog and "_render" not in dialog  # only the concept


def test_page_tells_the_solar_altitude_story():
    document = build_real_numbers_html(output_path=None)
    assert "solar altitude" in document and "not physically possible" in document


def test_config_carries_all_three_sections():
    config = _config(build_real_numbers_html(output_path=None, initial={"expr": "2 + 3"}))
    assert config["solution"]["order"]["result"] == "5"
    assert len(config["solution"]["properties"]) == 9 and config["solution"]["sum"]["exact"] == "0"
