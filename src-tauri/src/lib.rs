mod tts;
mod update_security;

use std::io::Write;
use std::time::Duration;
use tauri::Manager;

use update_security::{is_allowed_update_url, safe_installer_file_name};

#[tauri::command]
fn close_app(app: tauri::AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.destroy();
    } else {
        app.exit(0);
    }
}

/// Descarga el instalador NSIS y lo abre; cierra la app para poder reemplazarla.
#[tauri::command]
fn install_update(url: String, app: tauri::AppHandle) -> Result<(), String> {
    if !is_allowed_update_url(&url) {
        return Err("URL de actualización no permitida.".into());
    }

    let file_name = safe_installer_file_name(&url);
    let dest = std::env::temp_dir().join(file_name);

    let response = ureq::get(&url)
        .set("User-Agent", "Lektor-Updater")
        .call()
        .map_err(|e| format!("No se pudo descargar la actualización: {e}"))?;

    let mut reader = response.into_reader();
    let mut file = std::fs::File::create(&dest)
        .map_err(|e| format!("No se pudo guardar el instalador: {e}"))?;
    std::io::copy(&mut reader, &mut file)
        .map_err(|e| format!("Error al escribir el instalador: {e}"))?;
    file.flush()
        .map_err(|e| format!("Error al cerrar el instalador: {e}"))?;
    drop(file);

    let meta = std::fs::metadata(&dest).map_err(|e| e.to_string())?;
    if meta.len() < 1024 {
        let _ = std::fs::remove_file(&dest);
        return Err("La descarga del instalador está vacía o incompleta.".into());
    }

    std::process::Command::new(&dest)
        .spawn()
        .map_err(|e| format!("No se pudo abrir el instalador: {e}"))?;

    std::thread::spawn(move || {
        std::thread::sleep(Duration::from_millis(900));
        app.exit(0);
    });
    Ok(())
}

#[tauri::command]
fn app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
fn data_dir() -> Result<String, String> {
    tts::paths::data_dir().map(|p| p.to_string_lossy().into_owned())
}

#[tauri::command]
fn health() -> serde_json::Value {
    serde_json::json!({
        "app": "Lektor",
        "ok": true,
        "version": env!("CARGO_PKG_VERSION"),
        "shell": "tauri",
        "tts": true,
        "piper": true
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = rustls::crypto::ring::default_provider().install_default();
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            close_app,
            app_version,
            data_dir,
            health,
            install_update,
            tts::tts_status,
            tts::tts_list_neural,
            tts::tts_list_piper,
            tts::tts_get_prefs,
            tts::tts_save_prefs,
            tts::tts_download_piper,
            tts::tts_speak,
            tts::tts_preview
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                if let Some(webview) = window.app_handle().get_webview_window(window.label()) {
                    let _ = webview.eval(
                        "window.__lektorRequestClose && window.__lektorRequestClose()",
                    );
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error al iniciar Lektor (Tauri)");
}
