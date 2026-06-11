#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use clipbridge_lib::{clipboard::ClipboardMonitor, commands, db, shortcut, tray, AppState};
use std::sync::Arc;
use tauri::{Manager, WindowEvent};

fn main() {
    env_logger::init();
    log::info!("ClipBridge starting...");

    let clipboard_monitor = Arc::new(ClipboardMonitor::new());

    tauri::Builder::default()
        .manage(AppState { clipboard_monitor })
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            log::info!("Tauri setup starting...");

            // Initialize tray
            tray::setup_tray(app)?;

            // Initialize database
            db::init_db(app.handle())?;

            // Start clipboard monitoring
            let app_handle = app.handle().clone();
            let monitor = app.state::<AppState>().clipboard_monitor.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = monitor.start_monitoring(app_handle).await {
                    log::error!("Clipboard monitor error: {}", e);
                }
            });

            // Register global shortcut
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;
                let configured_shortcut = shortcut::load_shortcut();
                if let Err(e) = shortcut::register_shortcut(&app_handle, &configured_shortcut) {
                    log::error!("Failed to register global shortcut: {}", e);
                    if configured_shortcut != shortcut::DEFAULT_SHORTCUT {
                        let _ =
                            shortcut::register_shortcut(&app_handle, shortcut::DEFAULT_SHORTCUT);
                    }
                }
            });

            log::info!("Tauri setup completed");
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::Focused(is_focused) = event {
                if !is_focused && window.label() == "clipboard" {
                    // Hide clipboard window when it loses focus
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_clipboard_history,
            commands::copy_to_clipboard,
            commands::copy_clipboard_item,
            commands::pin_to_note,
            commands::get_notes,
            commands::save_note,
            commands::delete_note,
            commands::export_notes,
            commands::import_notes,
            commands::show_clipboard_window,
            commands::hide_clipboard_window,
            commands::get_global_shortcut,
            commands::set_global_shortcut,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
