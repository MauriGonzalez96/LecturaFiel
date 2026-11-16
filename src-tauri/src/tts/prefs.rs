use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

use super::paths;
use super::piper::{
    download_piper_voice, ensure_piper_binary, is_installed, piper_binary_ready,
    DEFAULT_PIPER_VOICE,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VoicePrefs {
    #[serde(default)]
    pub source: Option<String>,
    #[serde(default)]
    pub voice_id: Option<String>,
    #[serde(default = "default_rate")]
    pub rate: f64,
    #[serde(default)]
    pub first_run_done: bool,
    #[serde(default)]
    pub default_applied: bool,
    #[serde(default)]
    pub piper_failed: bool,
    #[serde(default)]
    pub download_pending: bool,
}

fn default_rate() -> f64 {
    0.92
}

impl Default for VoicePrefs {
    fn default() -> Self {
        Self {
            source: None,
            voice_id: None,
            rate: default_rate(),
            first_run_done: false,
            default_applied: false,
            piper_failed: false,
            download_pending: false,
        }
    }
}

pub fn load_prefs() -> Result<VoicePrefs, String> {
    let path = paths::prefs_file()?;
    if !path.is_file() {
        return Ok(VoicePrefs::default());
    }
    let raw = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&raw).map_err(|e| e.to_string())
}

fn write_prefs(prefs: &VoicePrefs) -> Result<(), String> {
    let path = paths::prefs_file()?;
    let pretty = serde_json::to_string_pretty(prefs).map_err(|e| e.to_string())?;
    std::fs::write(&path, pretty).map_err(|e| e.to_string())
}

/// Merge parcial (solo claves presentes en el JSON del front).
pub fn save_prefs(partial: Value) -> Result<VoicePrefs, String> {
    let mut current = serde_json::to_value(load_prefs()?).map_err(|e| e.to_string())?;
    if let Value::Object(map) = partial {
        if let Value::Object(cur) = &mut current {
            for (k, v) in map {
                cur.insert(k, v);
            }
        }
    }
    if let Some(rate) = current.get("rate").and_then(|v| v.as_f64()) {
        current["rate"] = json!(rate.clamp(0.7, 1.35));
    }
    let prefs: VoicePrefs = serde_json::from_value(current).map_err(|e| e.to_string())?;
    write_prefs(&prefs)?;
    Ok(prefs)
}

/// Primera apertura: voces Windows (estables). Piper se prepara en background.
pub fn ensure_default_prefs() -> Result<VoicePrefs, String> {
    let prefs = load_prefs()?;
    if prefs.first_run_done && prefs.source.is_some() {
        // Si quedó piper sin modelo, volver a Windows para no crashear al leer
        if prefs.source.as_deref() == Some("piper") {
            let vid = prefs
                .voice_id
                .clone()
                .unwrap_or_else(|| DEFAULT_PIPER_VOICE.to_string());
            if !is_installed(&vid) || !piper_binary_ready() {
                return save_prefs(json!({
                    "source": "windows",
                    "voiceId": null,
                    "downloadPending": true,
                    "piperFailed": false,
                }));
            }
        }
        return Ok(prefs);
    }

    let prefs = save_prefs(json!({
        "source": "windows",
        "voiceId": null,
        "firstRunDone": true,
        "defaultApplied": true,
        "downloadPending": true,
        "piperFailed": false,
    }))?;

    std::thread::Builder::new()
        .name("piper-prep".into())
        .spawn(|| {
            let ok = (|| -> Result<(), String> {
                ensure_piper_binary()?;
                download_piper_voice(DEFAULT_PIPER_VOICE, false)?;
                Ok(())
            })();
            match ok {
                Ok(()) => {
                    let _ = save_prefs(json!({
                        "downloadPending": false,
                        // No forzar piper: el usuario elige en Voces; deja Windows
                    }));
                }
                Err(_) => {
                    let _ = save_prefs(json!({
                        "downloadPending": false,
                        "piperFailed": true,
                    }));
                }
            }
        })
        .ok();

    Ok(prefs)
}
