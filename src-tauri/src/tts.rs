//! TTS vía sidecar / procesos externos (fase 4).
//! Por ahora solo expone estado; Piper/neural se conectan aquí.

use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct TtsStatus {
    pub available: bool,
    pub backends: Vec<&'static str>,
    pub note: String,
}

#[tauri::command]
pub fn tts_status() -> TtsStatus {
    TtsStatus {
        available: false,
        backends: vec!["windows-speech-synthesis (webview)"],
        note: "Piper/neural se migran desde desktop/*.py; WebView2 ya usa voces Windows."
            .into(),
    }
}
