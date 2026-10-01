"""Every domain repo builds a valid site, and its topics name real flashcards of this domain."""

import json
import re
import tomllib
from pathlib import Path

from general.api import build_site, discover_topics

ROOT = Path(__file__).resolve().parents[1]
SITE = tomllib.loads((ROOT / "pyproject.toml").read_text())["tool"]["portfolio-site"]
CARD = re.compile(r"[A-Z]+[0-9]?\.[0-9]+")


def test_site_builds_with_a_manifest(tmp_path):
    site = build_site(tmp_path / "_site", root=ROOT)
    manifest = json.loads((site / "api/v1/manifest.json").read_text())
    assert manifest["site"]["url"] == SITE["url"]
    for page in manifest["pages"].values():
        assert (site / page["path"]).is_file()


def test_topic_cards_are_flashcard_ids():
    bad = [(t.slug, c) for t in discover_topics(ROOT) for c in t.cards if not CARD.fullmatch(c)]
    assert not bad
