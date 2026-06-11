use directories::ProjectDirs;
use std::fs;
use std::path::PathBuf;
use tauri::Manager;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

pub const DEFAULT_SHORTCUT: &str = "Alt+V";

fn config_path() -> Result<PathBuf, String> {
    let project_dirs = ProjectDirs::from("com", "clipbridge", "ClipBridge")
        .ok_or("Failed to get project directories")?;
    let config_dir = project_dirs.config_dir();
    fs::create_dir_all(config_dir)
        .map_err(|e| format!("Failed to create config directory: {}", e))?;
    Ok(config_dir.join("shortcut.txt"))
}

pub fn load_shortcut() -> String {
    config_path()
        .and_then(|path| {
            fs::read_to_string(path).map_err(|e| format!("Failed to read shortcut: {}", e))
        })
        .ok()
        .map(|shortcut| shortcut.trim().to_string())
        .filter(|shortcut| !shortcut.is_empty())
        .unwrap_or_else(|| DEFAULT_SHORTCUT.to_string())
}

fn save_shortcut(shortcut: &str) -> Result<(), String> {
    let path = config_path()?;
    fs::write(path, shortcut).map_err(|e| format!("Failed to save shortcut: {}", e))
}

pub fn register_shortcut(app_handle: &tauri::AppHandle, shortcut: &str) -> Result<(), String> {
    log::info!("Registering global shortcut: {}", shortcut);

    app_handle
        .global_shortcut()
        .on_shortcut(shortcut, move |app_handle, _, event| {
            if event.state != ShortcutState::Pressed {
                return;
            }

            if let Some(window) = app_handle.get_webview_window("clipboard") {
                if let Err(error) = window.show().and_then(|_| window.set_focus()) {
                    log::error!("Failed to show clipboard overlay: {}", error);
                }
            }
        })
        .map_err(|e| format!("Failed to register shortcut '{}': {}", shortcut, e))
}

pub fn update_shortcut(app_handle: &tauri::AppHandle, shortcut: &str) -> Result<String, String> {
    let shortcut = shortcut.trim();
    if shortcut.is_empty() {
        return Err("Shortcut cannot be empty".to_string());
    }

    let previous = load_shortcut();
    app_handle
        .global_shortcut()
        .unregister_all()
        .map_err(|e| format!("Failed to unregister current shortcut: {}", e))?;

    if let Err(error) = register_shortcut(app_handle, shortcut) {
        let _ = register_shortcut(app_handle, &previous);
        return Err(error);
    }

    if let Err(error) = save_shortcut(shortcut) {
        let _ = app_handle.global_shortcut().unregister_all();
        let _ = register_shortcut(app_handle, &previous);
        return Err(error);
    }

    Ok(shortcut.to_string())
}
