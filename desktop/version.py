"""Versión de Lectura Fiel (misma que package.json / desktop/VERSION)."""

from __future__ import annotations

import json
from pathlib import Path

from paths import FRONT_DIR, RESOURCE_DIR

_FALLBACK = "0.0.0-dev"


def get_version() -> str:
    candidates = [
        Path(__file__).resolve().parent / "VERSION",
        RESOURCE_DIR / "VERSION",
        FRONT_DIR / "version.json",
    ]
    for path in candidates:
        try:
            if not path.is_file():
                continue
            raw = path.read_text(encoding="utf-8").strip()
            if not raw:
                continue
            if path.suffix.lower() == ".json":
                data = json.loads(raw)
                ver = str(data.get("version", "")).strip()
                if ver:
                    return ver
            else:
                return raw.splitlines()[0].strip()
        except Exception:
            continue
    return _FALLBACK


APP_VERSION = get_version()
WINDOW_TITLE = f"Lectura Fiel v{APP_VERSION}"
