use tauri::tray::TrayIconBuilder;
use tauri::App;

pub fn setup_tray(app: &mut App) -> Result<(), String> {
    log::info!("Setting up system tray...");

    // Build tray icon (simplified without menu for now)
    // Note: Icon is set in tauri.conf.json trayIcon section
    let _tray = TrayIconBuilder::new()
        .tooltip("ClipBridge")
        .build(app.handle())
        .map_err(|e| format!("Failed to build tray: {}", e))?;

    log::info!("System tray setup completed");
    Ok(())
}
