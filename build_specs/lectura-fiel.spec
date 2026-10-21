# -*- mode: python ; coding: utf-8 -*-
# Ejecutar desde desktop/: pyinstaller --noconfirm ..\build_specs\lectura-fiel.spec

import json
from pathlib import Path

from PyInstaller.utils.hooks import collect_all, collect_data_files, collect_dynamic_libs

ROOT = Path(SPECPATH).resolve().parent
DESKTOP_ROOT = ROOT / "desktop"
ASSETS = DESKTOP_ROOT / "assets"
ICON = ASSETS / "icon.ico"

_version_file = DESKTOP_ROOT / "VERSION"
if _version_file.is_file():
    APP_VERSION = _version_file.read_text(encoding="utf-8").strip().splitlines()[0].strip()
else:
    APP_VERSION = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))["version"]

EXE_NAME = f"LecturaFiel-v{APP_VERSION}"

wv_datas, wv_binaries, wv_hidden = collect_all("webview")
ort_datas, ort_binaries, ort_hidden = collect_all("onnxruntime")

# Piper necesita espeak-ng-data (phontab, etc.) y espeakbridge.pyd
piper_datas = collect_data_files("piper")
piper_binaries = collect_dynamic_libs("piper")

a = Analysis(
    [str(DESKTOP_ROOT / "main.py")],
    pathex=[str(DESKTOP_ROOT)],
    binaries=wv_binaries + ort_binaries + piper_binaries,
    datas=[
        (str(DESKTOP_ROOT / "static_front"), "static_front"),
        (str(DESKTOP_ROOT / "VERSION"), "."),
    ]
    + wv_datas
    + ort_datas
    + piper_datas,
    hiddenimports=[
        "server",
        "paths",
        "version",
        "tts_voices",
        "piper_engine",
        "piper_worker",
        "async_loop",
        "edge_tts",
        "piper",
        "piper.download_voices",
        "piper.phonemize_espeak",
        "piper.voice",
        "onnxruntime",
        "clr",
    ]
    + wv_hidden
    + ort_hidden,
    hookspath=[],
    runtime_hooks=[],
    excludes=["unittest", "pydoc", "test", "PIL", "pyi_splash"],
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name=EXE_NAME,
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    icon=str(ICON) if ICON.exists() else None,
)
