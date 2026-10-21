"""Voces neurales (Edge TTS) + preferencias persistentes."""

from __future__ import annotations

import json
import logging
import re
import uuid
from pathlib import Path
from typing import Any

from paths import DATA_DIR

PREFS_FILE = DATA_DIR / "voice_prefs.json"
AUDIO_DIR = DATA_DIR / "tts_cache"

# Fallback online si Piper no puede descargarse.
DEFAULT_NEURAL_VOICE = "es-AR-ElenaNeural"
SAMPLE_TEXT = (
    "En un lugar de la Mancha, de cuyo nombre no quiero acordarme, "
    "no ha mucho tiempo que vivía un hidalgo."
)

# Voces en español que conviene destacar en la UI.
PREFERRED_NEURAL = [
    "es-AR-ElenaNeural",
    "es-AR-TomasNeural",
    "es-ES-ElviraNeural",
    "es-ES-AlvaroNeural",
    "es-MX-DaliaNeural",
    "es-MX-JorgeNeural",
    "es-US-PalomaNeural",
    "es-US-AlonsoNeural",
]


def _ensure_dirs() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)


def load_prefs() -> dict[str, Any]:
    _ensure_dirs()
    if not PREFS_FILE.exists():
        return {
            "source": None,
            "voiceId": None,
            "rate": 0.92,
            "firstRunDone": False,
        }
    try:
        data = json.loads(PREFS_FILE.read_text(encoding="utf-8"))
        if "rate" not in data:
            data["rate"] = 0.92
        return data
    except Exception:
        return {
            "source": None,
            "voiceId": None,
            "rate": 0.92,
            "firstRunDone": False,
        }


def save_prefs(prefs: dict[str, Any]) -> dict[str, Any]:
    _ensure_dirs()
    current = load_prefs()
    current.update(prefs)
    PREFS_FILE.write_text(
        json.dumps(current, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return current


def ensure_default_prefs() -> dict[str, Any]:
    """Primera apertura: prefiere Piper; descarga el modelo en background."""
    import threading

    prefs = load_prefs()
    if prefs.get("firstRunDone") and prefs.get("source") and prefs.get("voiceId"):
        return prefs

    from piper_engine import DEFAULT_PIPER_VOICE, download_piper_voice

    prefs = save_prefs(
        {
            "source": "piper",
            "voiceId": DEFAULT_PIPER_VOICE,
            "firstRunDone": True,
            "defaultApplied": True,
            "downloadPending": True,
        }
    )

    def _bg_download() -> None:
        try:
            download_piper_voice(DEFAULT_PIPER_VOICE)
            save_prefs({"downloadPending": False})
        except Exception:
            logging.exception("Descarga Piper en background falló")
            save_prefs(
                {
                    "source": "neural",
                    "voiceId": DEFAULT_NEURAL_VOICE,
                    "piperFailed": True,
                    "downloadPending": False,
                }
            )

    threading.Thread(target=_bg_download, name="piper-download", daemon=True).start()
    return prefs


async def _list_edge_voices() -> list[dict[str, str]]:
    import edge_tts

    voices = await edge_tts.list_voices()
    out: list[dict[str, str]] = []
    for v in voices:
        locale = (v.get("Locale") or "").lower()
        if not locale.startswith("es"):
            continue
        short = v.get("ShortName") or ""
        out.append(
            {
                "id": short,
                "name": v.get("FriendlyName") or short,
                "locale": v.get("Locale") or "",
                "gender": v.get("Gender") or "",
                "source": "neural",
            }
        )

    def sort_key(item: dict[str, str]) -> tuple:
        vid = item["id"]
        preferred = PREFERRED_NEURAL.index(vid) if vid in PREFERRED_NEURAL else 99
        return (preferred, item.get("locale", ""), item.get("name", ""))

    out.sort(key=sort_key)
    return out


def list_neural_voices() -> list[dict[str, str]]:
    try:
        from async_loop import run_coro

        return run_coro(_list_edge_voices(), timeout=60)
    except Exception:
        logging.exception("No se pudieron listar voces neurales")
        return [
            {
                "id": vid,
                "name": vid,
                "locale": "-".join(vid.split("-")[:2]),
                "gender": "",
                "source": "neural",
            }
            for vid in PREFERRED_NEURAL
        ]


def _clamp_rate(rate: float | None) -> float:
    try:
        r = float(rate) if rate is not None else 0.92
    except (TypeError, ValueError):
        r = 0.92
    return max(0.7, min(1.35, r))


def _edge_rate_arg(rate: float | None) -> str:
    pct = int(round((_clamp_rate(rate) - 1.0) * 100))
    return f"{pct:+d}%"


async def _synthesize(
    voice: str, text: str, dest: Path, rate: float | None = None
) -> None:
    import edge_tts

    clean = re.sub(r"\s+", " ", text).strip()
    if not clean:
        raise ValueError("Texto vacío")
    if len(clean) > 2800:
        clean = clean[:2800]
    communicate = edge_tts.Communicate(clean, voice, rate=_edge_rate_arg(rate))
    await communicate.save(str(dest))


def synthesize_to_file(
    voice: str, text: str, rate: float | None = None
) -> Path:
    from async_loop import run_coro

    _ensure_dirs()
    dest = AUDIO_DIR / f"{uuid.uuid4().hex}.mp3"
    run_coro(_synthesize(voice, text, dest, rate=rate), timeout=180)
    return dest


def synthesize_preview(
    voice: str, text: str | None = None, rate: float | None = None
) -> Path:
    return synthesize_to_file(voice, text or SAMPLE_TEXT, rate=rate)


def cleanup_old_audio(keep: int = 8) -> None:
    _ensure_dirs()
    files = sorted(
        list(AUDIO_DIR.glob("*.mp3")) + list(AUDIO_DIR.glob("*.wav")),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    for f in files[keep:]:
        try:
            f.unlink()
        except OSError:
            pass