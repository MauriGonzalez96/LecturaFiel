"""TTS local con piper-tts vía subprocess (aislado del proceso UI)."""

from __future__ import annotations

import json
import logging
import re
import subprocess
import sys
import threading
import uuid
from pathlib import Path
from typing import Any

from paths import DATA_DIR, FROZEN

PIPER_DIR = DATA_DIR / "piper_voices"
AUDIO_DIR = DATA_DIR / "tts_cache"

DEFAULT_PIPER_VOICE = "es_AR-daniela-high"
# Textos largos matan memoria/onnx; el lector debe ir página por página.
MAX_CHARS = 2800

SPANISH_PIPER_VOICES: list[dict[str, str]] = [
    {
        "id": "es_AR-daniela-high",
        "name": "Daniela (Argentina, high)",
        "locale": "es_AR",
        "quality": "high",
    },
    {
        "id": "es_ES-davefx-medium",
        "name": "DaveFX (España, medium)",
        "locale": "es_ES",
        "quality": "medium",
    },
    {
        "id": "es_ES-sharvard-medium",
        "name": "Sharvard (España, medium)",
        "locale": "es_ES",
        "quality": "medium",
    },
    {
        "id": "es_ES-carlfm-x_low",
        "name": "Carlfm (España, x_low)",
        "locale": "es_ES",
        "quality": "x_low",
    },
    {
        "id": "es_MX-claude-high",
        "name": "Claude (México, high)",
        "locale": "es_MX",
        "quality": "high",
    },
    {
        "id": "es_MX-ald-medium",
        "name": "Ald (México, medium)",
        "locale": "es_MX",
        "quality": "medium",
    },
]

_synth_lock = threading.Lock()


def _ensure_dirs() -> None:
    PIPER_DIR.mkdir(parents=True, exist_ok=True)
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)


def onnx_path(voice_id: str) -> Path:
    return PIPER_DIR / f"{voice_id}.onnx"


def is_installed(voice_id: str) -> bool:
    p = onnx_path(voice_id)
    return p.is_file() and (PIPER_DIR / f"{voice_id}.onnx.json").is_file()


def list_piper_voices() -> list[dict[str, Any]]:
    return [
        {**v, "source": "piper", "installed": is_installed(v["id"])}
        for v in SPANISH_PIPER_VOICES
    ]


def download_piper_voice(voice_id: str, force: bool = False) -> dict[str, Any]:
    _ensure_dirs()
    if is_installed(voice_id) and not force:
        return {"ok": True, "voiceId": voice_id, "already": True}

    from piper.download_voices import download_voice

    logging.info("Descargando voz Piper %s → %s", voice_id, PIPER_DIR)
    download_voice(voice_id, PIPER_DIR, force_redownload=force)
    if not is_installed(voice_id):
        raise RuntimeError(f"No se pudo descargar la voz Piper: {voice_id}")
    return {"ok": True, "voiceId": voice_id, "already": False}


def ensure_default_piper_voice() -> str:
    try:
        download_piper_voice(DEFAULT_PIPER_VOICE)
        return DEFAULT_PIPER_VOICE
    except Exception:
        logging.exception("No se pudo descargar voz Piper por defecto")
        download_piper_voice("es_ES-davefx-medium")
        return "es_ES-davefx-medium"


def _worker_command(job_path: Path) -> list[str]:
    if FROZEN:
        return [sys.executable, "--piper-worker", str(job_path)]
    main_py = Path(__file__).resolve().parent / "main.py"
    return [sys.executable, str(main_py), "--piper-worker", str(job_path)]


def synthesize_piper_wav(voice_id: str, text: str) -> Path:
    """Síntesis en subprocess: si ONNX crashea, la ventana principal sobrevive."""
    _ensure_dirs()
    clean = re.sub(r"\s+", " ", text).strip()
    if not clean:
        raise ValueError("Texto vacío")
    if len(clean) > MAX_CHARS:
        clean = clean[:MAX_CHARS]

    if not is_installed(voice_id):
        download_piper_voice(voice_id)

    dest = AUDIO_DIR / f"{uuid.uuid4().hex}.wav"
    job_path = AUDIO_DIR / f"{dest.stem}.job.json"
    ok_path = job_path.with_suffix(".ok")
    err_path = job_path.with_suffix(".err")
    for p in (ok_path, err_path):
        if p.exists():
            p.unlink()

    espeak_hint = None
    try:
        import piper

        candidate = Path(piper.__file__).parent / "espeak-ng-data"
        if (candidate / "phontab").is_file():
            espeak_hint = str(candidate)
    except Exception:
        pass
    if FROZEN:
        meipass = Path(getattr(sys, "_MEIPASS", ""))
        for c in (meipass / "piper" / "espeak-ng-data", meipass / "espeak-ng-data"):
            if (c / "phontab").is_file():
                espeak_hint = str(c)
                break

    job = {
        "voiceId": voice_id,
        "text": clean,
        "out": str(dest),
        "models": str(PIPER_DIR),
        "espeakDataDir": espeak_hint,
    }
    job_path.write_text(json.dumps(job, ensure_ascii=False), encoding="utf-8")

    with _synth_lock:
        try:
            completed = subprocess.run(
                _worker_command(job_path),
                timeout=180,
                capture_output=True,
                text=True,
                check=False,
            )
        except subprocess.TimeoutExpired as e:
            raise RuntimeError(
                "Piper tardó demasiado. Probá con menos texto (una página)."
            ) from e

    if completed.returncode != 0 or not dest.is_file():
        detail = ""
        if err_path.is_file():
            detail = err_path.read_text(encoding="utf-8", errors="replace")[-1500:]
        elif completed.stderr:
            detail = completed.stderr[-1500:]
        logging.error("Piper worker falló: %s", detail)
        raise RuntimeError(
            "Falló la síntesis Piper. Probá otra voz o Neural/Windows.\n" + detail[:400]
        )

    try:
        job_path.unlink(missing_ok=True)
        ok_path.unlink(missing_ok=True)
        err_path.unlink(missing_ok=True)
    except OSError:
        pass
    return dest
