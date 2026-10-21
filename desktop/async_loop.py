"""Un solo event loop en hilo daemon para edge-tts (evita crash con asyncio.run en workers HTTP)."""

from __future__ import annotations

import asyncio
import threading
from collections.abc import Coroutine
from typing import Any, TypeVar

T = TypeVar("T")

_loop: asyncio.AbstractEventLoop | None = None
_ready = threading.Event()
_lock = threading.Lock()


def _thread_main() -> None:
    global _loop
    _loop = asyncio.new_event_loop()
    asyncio.set_event_loop(_loop)
    _ready.set()
    _loop.run_forever()


def ensure_loop() -> asyncio.AbstractEventLoop:
    global _loop
    with _lock:
        if _loop is None or _loop.is_closed():
            _ready.clear()
            t = threading.Thread(target=_thread_main, name="tts-asyncio", daemon=True)
            t.start()
            _ready.wait(timeout=10)
            if _loop is None:
                raise RuntimeError("No se pudo iniciar el loop de TTS")
        return _loop


def run_coro(coro: Coroutine[Any, Any, T], timeout: float = 180) -> T:
    loop = ensure_loop()
    fut = asyncio.run_coroutine_threadsafe(coro, loop)
    return fut.result(timeout=timeout)
