import sys
from pathlib import Path

FROZEN = getattr(sys, "frozen", False)

# Recursos empaquetados (static_front): dentro del .exe cuando está compilado.
RESOURCE_DIR = Path(getattr(sys, "_MEIPASS", Path(__file__).parent))

# Datos persistentes: al lado del .exe.
APP_DIR = Path(sys.executable).parent if FROZEN else Path(__file__).parent
DATA_DIR = APP_DIR / "data"

FRONT_DIR = RESOURCE_DIR / "static_front"
