//! TTS vía Tauri: Neural (MS Edge) + Piper (CLI oficial + modelos HF).

mod neural;
mod paths;
mod piper;
mod prefs;
mod voices;

use serde::Serialize;

pub use neural::synthesize_neural;
pub use piper::{download_piper_voice, list_piper_voices, synthesize_piper};
pub use prefs::{ensure_default_prefs, save_prefs, VoicePrefs};
pub use voices::{list_neural_voices, SAMPLE_TEXT};

#[derive(Debug, Serialize)]
pub struct TtsStatus {
    pub available: bool,
    pub backends: Vec<&'static str>,
    pub note: String,
}

#[tauri::command]
pub fn tts_status() -> TtsStatus {
    TtsStatus {
        available: true,
        backends: vec!["windows-speech-synthesis (webview)", "neural", "piper"],
        note: "Neural vía MS Edge; Piper descarga binario + modelo bajo demanda.".into(),
    }
}

#[tauri::command]
pub fn tts_list_neural() -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "voices": list_neural_voices(),
        "sampleText": SAMPLE_TEXT,
    }))
}

#[tauri::command]
pub fn tts_list_piper() -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "voices": list_piper_voices(),
        "sampleText": SAMPLE_TEXT,
    }))
}

#[tauri::command]
pub fn tts_get_prefs() -> Result<serde_json::Value, String> {
    let prefs = ensure_default_prefs()?;
    Ok(serde_json::json!({
        "prefs": prefs,
        "sampleText": SAMPLE_TEXT,
    }))
}

#[tauri::command]
pub fn tts_save_prefs(prefs: serde_json::Value) -> Result<VoicePrefs, String> {
    save_prefs(prefs)
}

#[tauri::command]
pub fn tts_download_piper(voice_id: String) -> Result<serde_json::Value, String> {
    download_piper_voice(&voice_id, false)
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpeakRequest {
    pub source: String,
    pub voice_id: String,
    pub text: String,
    pub rate: Option<f64>,
}

#[tauri::command]
pub fn tts_speak(req: SpeakRequest) -> Result<serde_json::Value, String> {
    let path = match req.source.as_str() {
        "piper" => synthesize_piper(&req.voice_id, &req.text, req.rate)?,
        "neural" => synthesize_neural(&req.voice_id, &req.text, req.rate)?,
        other => return Err(format!("Fuente TTS desconocida: {other}")),
    };
    cleanup_old_audio(12);
    Ok(serde_json::json!({
        "path": path.to_string_lossy(),
    }))
}

#[tauri::command]
pub fn tts_preview(req: SpeakRequest) -> Result<serde_json::Value, String> {
    let text = if req.text.trim().is_empty() {
        SAMPLE_TEXT.to_string()
    } else {
        req.text
    };
    tts_speak(SpeakRequest {
        source: req.source,
        voice_id: req.voice_id,
        text,
        rate: req.rate,
    })
}

fn cleanup_old_audio(keep: usize) {
    let dir = match paths::audio_dir() {
        Ok(d) => d,
        Err(_) => return,
    };
    let mut files: Vec<_> = std::fs::read_dir(&dir)
        .into_iter()
        .flatten()
        .flatten()
        .filter(|e| {
            e.path()
                .extension()
                .and_then(|x| x.to_str())
                .map(|ext| ext.eq_ignore_ascii_case("mp3") || ext.eq_ignore_ascii_case("wav"))
                .unwrap_or(false)
        })
        .collect();
    files.sort_by_key(|e| {
        std::cmp::Reverse(
            e.metadata()
                .and_then(|m| m.modified())
                .unwrap_or(std::time::SystemTime::UNIX_EPOCH),
        )
    });
    for e in files.into_iter().skip(keep) {
        let _ = std::fs::remove_file(e.path());
    }
}
