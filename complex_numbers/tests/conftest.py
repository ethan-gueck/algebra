"""Make the topic package (and, through it, general/) importable however pytest is launched."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
