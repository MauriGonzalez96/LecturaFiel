use std::path::{Path, PathBuf};
use std::sync::Once;

use msedge_tts::tts::client::connect;
use msedge_tts::tts::SpeechConfig;

use super::paths;

const MAX_CHARS: usize = 2800;
static INSTALL_CRYPTO: Once = Once::new();

fn ensure_rustls_crypto() {
    INSTALL_CRYPTO.call_once(|| {
        let _ = rustls::crypto::ring::default_provider().install_default();
    });
}

pub fn synthesize_neural(voice_id: &str, text: &str, rate: Option<f64>) -> Result<PathBuf, String> {
    ensure_rustls_crypto();
    let clean = normalize_text(text)?;
    let dest = paths::audio_dir()?.join(format!("{}.mp3", uuid_hex()));

    let config = SpeechConfig {
        voice_name: resolve_voice_name(voice_id),
        audio_format: "audio-24khz-48kbitrate-mono-mp3".into(),
        pitch: 0,
        rate: edge_rate_pct(rate),
        volume: 0,
    };

    let mut client = connect().map_err(|e| format!("No se pudo conectar a Edge TTS: {e}"))?;
    let audio = client
        .synthesize(&clean, &config)
        .map_err(|e| format!("Síntesis neural falló: {e}"))?;

    std::fs::write(&dest, audio.audio_bytes).map_err(|e| e.to_string())?;
    if !dest.is_file() || file_len(&dest)? == 0 {
        return Err("Edge TTS devolvió audio vacío".into());
    }
    Ok(dest)
}

fn resolve_voice_name(voice_id: &str) -> String {
    if let Ok(voices) = msedge_tts::voice::get_voices_list() {
        for v in voices {
            if v.short_name.as_deref() == Some(voice_id) || v.name == voice_id {
                return v.name;
            }
        }
    }
    voice_id.to_string()
}

fn edge_rate_pct(rate: Option<f64>) -> i32 {
    let r = rate.unwrap_or(0.92).clamp(0.7, 1.35);
    ((r - 1.0) * 100.0).round() as i32
}

fn normalize_text(text: &str) -> Result<String, String> {
    let mut clean = text.split_whitespace().collect::<Vec<_>>().join(" ");
    if clean.is_empty() {
        return Err("Texto vacío".into());
    }
    if clean.chars().count() > MAX_CHARS {
        clean = clean.chars().take(MAX_CHARS).collect();
    }
    Ok(clean)
}

fn uuid_hex() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let t = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    format!("{t:x}")
}

fn file_len(path: &Path) -> Result<u64, String> {
    Ok(std::fs::metadata(path).map_err(|e| e.to_string())?.len())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn neural_preview_writes_mp3() {
        if std::env::var("LEKTOR_LIVE_TTS").ok().as_deref() != Some("1") {
            eprintln!("omitido: seteá LEKTOR_LIVE_TTS=1 para probar Edge TTS");
            return;
        }
        let path = synthesize_neural(
            "es-AR-ElenaNeural",
            "Hola, esto es una prueba breve de Lektor.",
            Some(0.9),
        )
        .expect("síntesis neural");
        assert!(path.is_file(), "falta archivo {:?}", path);
        assert!(file_len(&path).unwrap() > 500, "audio demasiado chico");
        let _ = std::fs::remove_file(&path);
    }
}
