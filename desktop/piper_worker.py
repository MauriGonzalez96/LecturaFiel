"""Worker aislado: carga ONNX en otro proceso para que un crash nativo no mate la UI."""

from __future__ import annotations

import json
import sys
import traceback
import wave
from pathlib import Path


def _espeak_data_dir(hint: str | None = None) -> Path:
    """Localiza espeak-ng-data dentro del .exe (_MEIPASS) o del paquete piper."""
    candidates: list[Path] = []
    if hint:
        candidates.append(Path(hint))
    meipass = getattr(sys, "_MEIPASS", None)
    if meipass:
        base = Path(meipass)
        candidates.extend(
            [
                base / "piper" / "espeak-ng-data",
                base / "espeak-ng-data",
            ]
        )
    try:
        import piper

        candidates.append(Path(piper.__file__).parent / "espeak-ng-data")
    except Exception:
        pass

    for c in candidates:
        if (c / "phontab").is_file():
            return c
    raise FileNotFoundError(
        "No se encontró espeak-ng-data/phontab. Recompilá el .exe "
        "(debe incluir piper/espeak-ng-data)."
    )


def run_worker(job_path: str) -> int:
    try:
        job = json.loads(Path(job_path).read_text(encoding="utf-8"))
        voice_id = job["voiceId"]
        text = job["text"]
        out = Path(job["out"])
        models = Path(job["models"])
        onnx = models / f"{voice_id}.onnx"
        if not onnx.is_file():
            raise FileNotFoundError(f"Modelo no encontrado: {onnx}")

        espeak_dir = _espeak_data_dir(job.get("espeakDataDir"))

        from piper import PiperVoice

        length_scale = float(job.get("lengthScale") or 1.0)
        length_scale = max(0.5, min(2.0, length_scale))

        voice = PiperVoice.load(str(onnx), espeak_data_dir=str(espeak_dir))
        out.parent.mkdir(parents=True, exist_ok=True)
        with wave.open(str(out), "wb") as wav_file:
            # Piper 1.x: length_scale en synthesize_wav si está disponible
            try:
                voice.synthesize_wav(text, wav_file, length_scale=length_scale)
            except TypeError:
                voice.synthesize_wav(text, wav_file)
        Path(job_path).with_suffix(".ok").write_text("ok", encoding="utf-8")
        return 0
    except Exception:
        err = traceback.format_exc()
        try:
            Path(job_path).with_suffix(".err").write_text(err, encoding="utf-8")
        except Exception:
            pass
        try:
            sys.stderr.write(err)
        except Exception:
            pass
        return 1


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(2)
    sys.exit(run_worker(sys.argv[1]))
