"""
Root conftest.py — runs before any test module import.

Stubs out weasyprint and its dependencies so tests can run on Windows
without the native system libraries (pango, cairo, gobject) that are
only available inside Docker.
"""

import sys
from unittest.mock import MagicMock

# Stub weasyprint and its internal submodules before app imports them.
# The actual PDF generation is patched per-test in pdf smoke tests.
_weasyprint_mock = MagicMock()
sys.modules.setdefault("weasyprint", _weasyprint_mock)
sys.modules.setdefault("weasyprint.HTML", _weasyprint_mock)
sys.modules.setdefault("weasyprint.CSS", _weasyprint_mock)
