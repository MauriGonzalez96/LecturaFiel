"""Servidor HTTP: SPA + API de voces / audio TTS."""

from __future__ import annotations

import json
import logging
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from paths import DATA_DIR
from piper_engine import (
    download_piper_voice,
    list_piper_voices,
    synthesize_piper_wav,
)
from tts_voices import (
    SAMPLE_TEXT,
    cleanup_old_audio,
    ensure_default_prefs,
    list_neural_voices,
    save_prefs,
    synthesize_preview,
    synthesize_to_file,
)


class FrontHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, directory: str | None = None, **kwargs):
        super().__init__(*args, directory=directory, **kwargs)

    def log_message(self, format: str, *args) -> None:  # noqa: A003
        return

    def _json(self, payload: object, status: int = 200) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self) -> dict:
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length) if length else b"{}"
        try:
            data = json.loads(raw.decode("utf-8") or "{}")
            return data if isinstance(data, dict) else {}
        except json.JSONDecodeError:
            return {}

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/") or "/"

        if path == "/api/health":
            from version import APP_VERSION

            self._json(
                {
                    "app": "Lectura Fiel",
                    "ok": True,
                    "version": APP_VERSION,
                    "tts": True,
                    "piper": True,
                }
            )
            return

        if path == "/api/voices/neural":
            try:
                voices = list_neural_voices()
                self._json({"voices": voices, "sampleText": SAMPLE_TEXT})
            except Exception as e:
                logging.exception("list neural")
                self._json({"error": str(e), "voices": []}, 500)
            return

        if path == "/api/voices/piper":
            try:
                self._json(
                    {"voices": list_piper_voices(), "sampleText": SAMPLE_TEXT}
                )
            except Exception as e:
                logging.exception("list piper")
                self._json({"error": str(e), "voices": []}, 500)
            return

        if path == "/api/voices/prefs":
            prefs = ensure_default_prefs()
            self._json({"prefs": prefs, "sampleText": SAMPLE_TEXT})
            return

        if path.startswith("/api/audio/"):
            name = path.split("/")[-1]
            if ".." in name or "/" in name:
                self.send_error(400)
                return
            if not (name.endswith(".mp3") or name.endswith(".wav")):
                self.send_error(400)
                return
            file_path = DATA_DIR / "tts_cache" / name
            if not file_path.is_file():
                self.send_error(404)
                return
            data = file_path.read_bytes()
            ctype = "audio/mpeg" if name.endswith(".mp3") else "audio/wav"
            self.send_response(200)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(data)
            return

        if (
            not path.startswith("/assets/")
            and not path.startswith("/api/")
            and "." not in Path(path).name
            and path not in ("/", "/index.html")
        ):
            self.path = "/index.html"

        return super().do_GET()

    def do_POST(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")

        if path == "/api/voices/prefs":
            body = self._read_json()
            prefs = save_prefs(
                {
                    "source": body.get("source"),
                    "voiceId": body.get("voiceId"),
                    "firstRunDone": True,
                }
            )
            self._json({"ok": True, "prefs": prefs})
            return

        if path == "/api/voices/piper/download":
            body = self._read_json()
            voice = body.get("voiceId") or ""
            if not voice:
                self._json({"error": "Falta voiceId"}, 400)
                return
            try:
                result = download_piper_voice(voice, force=bool(body.get("force")))
                self._json(result)
            except Exception as e:
                logging.exception("piper download")
                self._json({"error": str(e)}, 500)
            return

        if path == "/api/voices/preview":
            body = self._read_json()
            voice = body.get("voiceId") or ""
            source = body.get("source") or "neural"
            text = body.get("text") or SAMPLE_TEXT
            if not voice:
                self._json({"error": "Falta voiceId"}, 400)
                return
            try:
                if source == "piper":
                    dest = synthesize_piper_wav(voice, text)
                else:
                    dest = synthesize_preview(voice, text)
                cleanup_old_audio()
                self._json({"ok": True, "url": f"/api/audio/{dest.name}"})
            except Exception as e:
                logging.exception("preview")
                self._json({"error": str(e)}, 500)
            return

        if path == "/api/voices/speak":
            body = self._read_json()
            voice = body.get("voiceId") or ""
            source = body.get("source") or "neural"
            text = body.get("text") or ""
            if not voice or not text.strip():
                self._json({"error": "Faltan voiceId o text"}, 400)
                return
            try:
                if source == "piper":
                    dest = synthesize_piper_wav(voice, text)
                else:
                    dest = synthesize_to_file(voice, text)
                cleanup_old_audio(keep=4)
                self._json({"ok": True, "url": f"/api/audio/{dest.name}"})
            except Exception as e:
                logging.exception("speak")
                self._json({"error": str(e)}, 500)
            return

        self._json({"error": "Not found"}, 404)


class FrontServer:
    def __init__(self, host: str, port: int, front_dir: Path):
        handler = partial(FrontHandler, directory=str(front_dir))
        self._httpd = ThreadingHTTPServer((host, port), handler)
        self._thread: threading.Thread | None = None

    @property
    def port(self) -> int:
        return self._httpd.server_address[1]

    def start(self) -> None:
        # Preferencias + descarga Piper en background para no bloquear el arranque.
        def _boot() -> None:
            try:
                ensure_default_prefs()
            except Exception:
                logging.exception("prefs default")

        threading.Thread(target=_boot, daemon=True).start()
        self._thread = threading.Thread(target=self._httpd.serve_forever, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        try:
            self._httpd.shutdown()
        except Exception:
            pass
        try:
            self._httpd.server_close()
        except Exception:
            pass
        if self._thread:
            self._thread.join(timeout=5)
