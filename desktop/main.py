"""Punto de entrada de LecturaFiel.exe: sirve el SPA y abre WebView2.

Al cerrar (botón in-app o X confirmada) detiene el servidor y llama os._exit(0)
para no dejar procesos huérfanos — mismo patrón que MixCS.

Variables de entorno:
  LECTURA_FIEL_PORT=8877
  LECTURA_FIEL_NO_BROWSER=1   solo servidor
  LECTURA_FIEL_BROWSER=1      forzar navegador
  LECTURA_FIEL_DEBUG=1
"""

from __future__ import annotations

import sys

# CRITICAL: el worker Piper debe arrancar ANTES de pyi_splash / webview.
# Si no, el subproceso del .exe falla con KeyError: '_PYI_SPLASH_IPC'.
if len(sys.argv) >= 3 and sys.argv[1] == "--piper-worker":
    from piper_worker import run_worker

    raise SystemExit(run_worker(sys.argv[2]))

import json
import logging
import os
import socket
import threading
import time
import urllib.request
import webbrowser

from paths import DATA_DIR, FRONT_DIR
from server import FrontServer
from version import APP_VERSION, WINDOW_TITLE

HOST = "127.0.0.1"
DEFAULT_PORT = int(os.getenv("LECTURA_FIEL_PORT", "8877"))

# pyi_splash puede existir empaquetado pero sin IPC (p. ej. worker / builds sin splash).
try:
    import pyi_splash  # type: ignore
except Exception:
    pyi_splash = None


def _splash_text(text: str) -> None:
    if pyi_splash:
        try:
            pyi_splash.update_text(text)
        except Exception:
            pass


def _splash_close() -> None:
    if pyi_splash:
        try:
            pyi_splash.close()
        except Exception:
            pass


def _is_app_running(port: int) -> bool:
    try:
        with urllib.request.urlopen(f"http://{HOST}:{port}/api/health", timeout=1) as r:
            return json.load(r).get("app") == "Lectura Fiel"
    except Exception:
        return False


def _port_free(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex((HOST, port)) != 0


def _pick_port() -> int:
    for port in range(DEFAULT_PORT, DEFAULT_PORT + 20):
        if _port_free(port):
            return port
    raise RuntimeError("No hay puertos libres para Lectura Fiel")


def _wait_ready(url: str, timeout: float = 15) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url + "api/health", timeout=1) as r:
                if json.load(r).get("ok"):
                    return True
        except Exception:
            time.sleep(0.15)
    return False


def _message_box(text: str, title: str | None = None) -> None:
    if title is None:
        title = WINDOW_TITLE
    if os.name == "nt":
        import ctypes

        ctypes.windll.user32.MessageBoxW(None, text, title, 0x40)
    else:
        print(text)


class DesktopApi:
    """Expuesto al frontend como window.pywebview.api.*"""

    def __init__(self) -> None:
        self._window = None
        self._allow_close = False

    def close_app(self) -> None:
        """Botón Cerrar: única vía que realmente destruye la ventana."""
        self._allow_close = True
        if self._window is not None:
            threading.Thread(target=self._window.destroy, daemon=True).start()

    def _on_closing(self):
        if self._allow_close:
            return True
        threading.Thread(target=self._ask_close, daemon=True).start()
        return False

    def _ask_close(self) -> None:
        try:
            handled = self._window.evaluate_js(
                "window.__lecturaFielRequestClose "
                "? (window.__lecturaFielRequestClose(), true) : false"
            )
        except Exception:
            handled = False
        if not handled:
            self.close_app()


def _run_window(url: str) -> bool:
    try:
        import webview
    except Exception:
        return False

    api = DesktopApi()
    try:
        webview.settings["ALLOW_DOWNLOADS"] = True
        window = webview.create_window(
            WINDOW_TITLE,
            url,
            js_api=api,
            width=1280,
            height=860,
            min_size=(900, 640),
            background_color="#e8eef4",
            text_select=True,
        )
        api._window = window
        window.events.loaded += _splash_close
        window.events.closing += api._on_closing
        storage = DATA_DIR / "webview"
        storage.mkdir(parents=True, exist_ok=True)
        webview.start(
            private_mode=False,
            storage_path=str(storage),
            debug=bool(os.getenv("LECTURA_FIEL_DEBUG")),
        )
        return True
    except Exception:
        logging.exception("No se pudo abrir la ventana")
        return False


def main() -> None:
    if sys.stdout is None:
        sys.stdout = open(os.devnull, "w")
    if sys.stderr is None:
        sys.stderr = open(os.devnull, "w")

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(
        filename=DATA_DIR / "lectura-fiel.log",
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    if not FRONT_DIR.is_dir():
        _splash_close()
        _message_box(
            f"No se encontró la interfaz empaquetada:\n{FRONT_DIR}\n\n"
            "Ejecutá build.bat primero.",
            f"Lectura Fiel v{APP_VERSION} - Error",
        )
        os._exit(1)

    headless = bool(os.getenv("LECTURA_FIEL_NO_BROWSER"))
    use_browser = bool(os.getenv("LECTURA_FIEL_BROWSER"))

    if not headless and _is_app_running(DEFAULT_PORT):
        url = f"http://{HOST}:{DEFAULT_PORT}/"
        _splash_close()
        if use_browser or not _run_window(url):
            webbrowser.open(url, new=1)
        os._exit(0)

    _splash_text(f"Iniciando Lectura Fiel v{APP_VERSION}...")
    port = _pick_port()
    url = f"http://{HOST}:{port}/"

    server = FrontServer(HOST, port, FRONT_DIR)
    server.start()

    if headless:
        print(f"Lectura Fiel en {url} (sin ventana)", flush=True)
        try:
            while True:
                time.sleep(3600)
        except KeyboardInterrupt:
            pass
        server.stop()
        os._exit(0)

    if not _wait_ready(url):
        _splash_close()
        _message_box(
            "No se pudo iniciar el servidor de Lectura Fiel.",
            f"Lectura Fiel v{APP_VERSION} - Error",
        )
        server.stop()
        os._exit(1)

    _splash_text("Abriendo ventana...")
    opened = False if use_browser else _run_window(url)
    if not opened:
        _splash_close()
        webbrowser.open(url, new=1)
        _message_box(
            f"Lectura Fiel se abrió en tu navegador:\n{url}\n\n"
            "Cuando termines, tocá Aceptar para cerrar la aplicación.",
        )

    server.stop()
    logging.shutdown()
    os._exit(0)


if __name__ == "__main__":
    main()
