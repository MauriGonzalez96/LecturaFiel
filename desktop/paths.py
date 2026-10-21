"""Rutas de recursos y datos persistentes."""

from __future__ import annotations

import os
import shutil
import sys
from pathlib import Path

FROZEN = getattr(sys, "frozen", False)

# Recursos empaquetados (static_front): dentro del .exe cuando está compilado.
RESOURCE_DIR = Path(getattr(sys, "_MEIPASS", Path(__file__).parent))

# Carpeta del .exe (solo referencia; no escribir acá en Program Files / Descargas bloqueadas).
APP_DIR = Path(sys.executable).parent if FROZEN else Path(__file__).parent

FRONT_DIR = RESOURCE_DIR / "static_front"


def _resolve_data_dir() -> Path:
    """Datos en %LOCALAPPDATA%\\LecturaFiel para evitar errores de permisos."""
    if not FROZEN:
        return Path(__file__).parent / "data"

    local = os.environ.get("LOCALAPPDATA")
    if local:
        target = Path(local) / "LecturaFiel"
    else:
        target = Path.home() / "AppData" / "Local" / "LecturaFiel"

    # Migrar datos viejos que estaban al lado del .exe
    legacy = APP_DIR / "data"
    try:
        if legacy.is_dir() and not (target / "voice_prefs.json").exists():
            target.mkdir(parents=True, exist_ok=True)
            for item in legacy.iterdir():
                dest = target / item.name
                if dest.exists():
                    continue
                if item.is_dir():
                    shutil.copytree(item, dest, dirs_exist_ok=True)
                else:
                    shutil.copy2(item, dest)
    except OSError:
        pass

    target.mkdir(parents=True, exist_ok=True)
    return target


DATA_DIR = _resolve_data_dir()
