use std::path::PathBuf;

pub fn data_dir() -> Result<PathBuf, String> {
    let base = dirs::data_local_dir().ok_or_else(|| "No hay AppData local".to_string())?;
    let path = base.join("LecturaFiel");
    std::fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    Ok(path)
}

pub fn audio_dir() -> Result<PathBuf, String> {
    let path = data_dir()?.join("tts_cache");
    std::fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    Ok(path)
}

pub fn piper_voices_dir() -> Result<PathBuf, String> {
    let path = data_dir()?.join("piper_voices");
    std::fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    Ok(path)
}

pub fn piper_bin_dir() -> Result<PathBuf, String> {
    let path = data_dir()?.join("piper_bin");
    std::fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    Ok(path)
}

pub fn prefs_file() -> Result<PathBuf, String> {
    Ok(data_dir()?.join("voice_prefs.json"))
}
