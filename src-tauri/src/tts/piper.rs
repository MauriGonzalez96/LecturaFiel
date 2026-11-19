use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

use serde::Serialize;
use serde_json::json;

use super::paths;

pub const DEFAULT_PIPER_VOICE: &str = "es_AR-daniela-high";
const MAX_CHARS: usize = 2800;
const PIPER_ZIP_URL: &str =
    "https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_windows_amd64.zip";
const HF_BASE: &str = "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0";

#[derive(Debug, Clone, Serialize)]
pub struct PiperVoiceInfo {
    pub id: String,
    pub name: String,
    pub locale: String,
    pub quality: String,
    pub source: &'static str,
    pub installed: bool,
}

const CATALOG: &[(&str, &str, &str, &str)] = &[
    ("es_AR-daniela-high", "Daniela (Argentina, high)", "es_AR", "high"),
    ("es_ES-davefx-medium", "DaveFX (España, medium)", "es_ES", "medium"),
    ("es_ES-sharvard-medium", "Sharvard (España, medium)", "es_ES", "medium"),
    ("es_ES-carlfm-x_low", "Carlfm (España, x_low)", "es_ES", "x_low"),
    ("es_MX-claude-high", "Claude (México, high)", "es_MX", "high"),
    ("es_MX-ald-medium", "Ald (México, medium)", "es_MX", "medium"),
];

pub fn list_piper_voices() -> Vec<PiperVoiceInfo> {
    CATALOG
        .iter()
        .map(|(id, name, locale, quality)| PiperVoiceInfo {
            id: (*id).into(),
            name: (*name).into(),
            locale: (*locale).into(),
            quality: (*quality).into(),
            source: "piper",
            installed: is_installed(id),
        })
        .collect()
}

pub fn is_installed(voice_id: &str) -> bool {
    match (onnx_path(voice_id), onnx_json_path(voice_id)) {
        (Ok(onnx), Ok(meta)) => onnx.is_file() && meta.is_file(),
        _ => false,
    }
}

fn onnx_path(voice_id: &str) -> Result<PathBuf, String> {
    Ok(paths::piper_voices_dir()?.join(format!("{voice_id}.onnx")))
}

fn onnx_json_path(voice_id: &str) -> Result<PathBuf, String> {
    Ok(paths::piper_voices_dir()?.join(format!("{voice_id}.onnx.json")))
}

/// `es_AR-daniela-high` → `es/es_AR/daniela/high`
fn voice_hf_path(voice_id: &str) -> Result<String, String> {
    let (locale_name, quality) = voice_id
        .rsplit_once('-')
        .ok_or_else(|| format!("voiceId Piper inválido: {voice_id}"))?;
    let (locale, name) = locale_name
        .split_once('-')
        .ok_or_else(|| format!("voiceId Piper inválido: {voice_id}"))?;
    let lang = locale
        .split('_')
        .next()
        .ok_or_else(|| format!("voiceId Piper inválido: {voice_id}"))?;
    Ok(format!("{lang}/{locale}/{name}/{quality}"))
}

pub fn download_piper_voice(voice_id: &str, force: bool) -> Result<serde_json::Value, String> {
    if is_installed(voice_id) && !force {
        return Ok(json!({ "ok": true, "voiceId": voice_id, "already": true }));
    }
    let rel = voice_hf_path(voice_id)?;
    let onnx = onnx_path(voice_id)?;
    let meta = onnx_json_path(voice_id)?;

    download_file(
        &format!("{HF_BASE}/{rel}/{voice_id}.onnx"),
        &onnx,
    )?;
    download_file(
        &format!("{HF_BASE}/{rel}/{voice_id}.onnx.json"),
        &meta,
    )?;

    if !is_installed(voice_id) {
        return Err(format!("No se pudo descargar la voz Piper: {voice_id}"));
    }
    Ok(json!({ "ok": true, "voiceId": voice_id, "already": false }))
}

pub fn synthesize_piper(
    voice_id: &str,
    text: &str,
    rate: Option<f64>,
) -> Result<PathBuf, String> {
    let clean = normalize_text(text)?;
    if !is_installed(voice_id) {
        download_piper_voice(voice_id, false)?;
    }
    let piper_exe = ensure_piper_binary()?;
    let model = onnx_path(voice_id)?;
    let dest = paths::audio_dir()?.join(format!("{}.wav", uuid_hex()));
    let length_scale = length_scale_from_rate(rate);

    let mut child = Command::new(&piper_exe)
        .arg("--model")
        .arg(&model)
        .arg("--output_file")
        .arg(&dest)
        .arg("--length_scale")
        .arg(format!("{length_scale:.3}"))
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("No se pudo ejecutar Piper: {e}"))?;

    {
        let mut stdin = child
            .stdin
            .take()
            .ok_or_else(|| "Piper sin stdin".to_string())?;
        stdin
            .write_all(clean.as_bytes())
            .map_err(|e| e.to_string())?;
    }

    let output = child
        .wait_with_output()
        .map_err(|e| format!("Piper falló al esperar: {e}"))?;
    if !output.status.success() || !dest.is_file() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(format!(
            "Falló la síntesis Piper. Probá otra voz o Neural/Windows.\n{}",
            &err.chars().take(400).collect::<String>()
        ));
    }
    Ok(dest)
}

/// Solo comprueba disco (sin descargar).
pub fn piper_binary_ready() -> bool {
    find_piper_exe().is_some()
}

fn find_piper_exe() -> Option<PathBuf> {
    let bin_dir = paths::piper_bin_dir().ok()?;
    let candidates = [
        bin_dir.join("piper").join("piper.exe"),
        bin_dir.join("piper.exe"),
    ];
    for c in candidates {
        if c.is_file() {
            return Some(c);
        }
    }
    walkdir_exe(&bin_dir)
        .into_iter()
        .find(|e| e.file_name().and_then(|n| n.to_str()) == Some("piper.exe"))
}

pub fn ensure_piper_binary() -> Result<PathBuf, String> {
    if let Some(exe) = find_piper_exe() {
        return Ok(exe);
    }

    let bin_dir = paths::piper_bin_dir()?;
    let zip_path = bin_dir.join("piper_windows_amd64.zip");
    download_file(PIPER_ZIP_URL, &zip_path)?;
    extract_zip(&zip_path, &bin_dir)?;
    let _ = std::fs::remove_file(&zip_path);

    find_piper_exe().ok_or_else(|| "No se encontró piper.exe tras la descarga".into())
}

fn walkdir_exe(root: &Path) -> Vec<PathBuf> {
    let mut out = Vec::new();
    let mut stack = vec![root.to_path_buf()];
    while let Some(dir) = stack.pop() {
        let Ok(rd) = std::fs::read_dir(&dir) else {
            continue;
        };
        for e in rd.flatten() {
            let p = e.path();
            if p.is_dir() {
                stack.push(p);
            } else {
                out.push(p);
            }
        }
    }
    out
}

fn extract_zip(zip_path: &Path, dest: &Path) -> Result<(), String> {
    let file = std::fs::File::open(zip_path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;
    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
        let outpath = match file.enclosed_name() {
            Some(path) => dest.join(path),
            None => continue,
        };
        if file.name().ends_with('/') {
            std::fs::create_dir_all(&outpath).map_err(|e| e.to_string())?;
        } else {
            if let Some(parent) = outpath.parent() {
                std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            let mut outfile = std::fs::File::create(&outpath).map_err(|e| e.to_string())?;
            std::io::copy(&mut file, &mut outfile).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

fn download_file(url: &str, dest: &Path) -> Result<(), String> {
    if let Some(parent) = dest.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let tmp = dest.with_extension("partial");
    let resp = ureq::get(url)
        .set("User-Agent", "Lektor/0.3.8")
        .call()
        .map_err(|e| format!("Descarga falló ({url}): {e}"))?;
    if !(200..300).contains(&resp.status()) {
        return Err(format!("HTTP {} al descargar {url}", resp.status()));
    }
    let mut reader = resp.into_reader();
    let mut file = std::fs::File::create(&tmp).map_err(|e| e.to_string())?;
    std::io::copy(&mut reader, &mut file).map_err(|e| e.to_string())?;
    std::fs::rename(&tmp, dest).map_err(|e| e.to_string())?;
    Ok(())
}

fn length_scale_from_rate(rate: Option<f64>) -> f64 {
    let r = rate.unwrap_or(0.92).clamp(0.7, 1.35);
    if r <= 0.0 {
        1.0
    } else {
        (1.0 / r * 1000.0).round() / 1000.0
    }
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
