mod tts;

use tauri::Manager;

#[tauri::command]
fn close_app(app: tauri::AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.destroy();
    } else {
        app.exit(0);
    }
}

#[tauri::command]
fn app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
fn data_dir() -> Result<String, String> {
    let base = dirs::data_local_dir().ok_or_else(|| "No hay AppData local".to_string())?;
    let path = base.join("LecturaFiel");
    std::fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().into_owned())
}

#[tauri::command]
fn health() -> serde_json::Value {
    serde_json::json!({
        "app": "Lectura Fiel",
        "ok": true,
        "version": env!("CARGO_PKG_VERSION"),
        "shell": "tauri",
        "tts": false,
        "piper": false
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            close_app,
            app_version,
            data_dir,
            health,
            tts::tts_status
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // Pedir confirmación al front (mismo patrón que pywebview)
                api.prevent_close();
                let _ = window.eval(
                    "window.__lecturaFielRequestClose && window.__lecturaFielRequestClose()",
                );
            }
        })
        .run(tauri::generate_context!())
        .expect("error al iniciar Lectura Fiel (Tauri)");
}
