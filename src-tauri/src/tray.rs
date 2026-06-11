use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    App, AppHandle, Manager,
};

const SHOW_MAIN_ID: &str = "show_main";
const SHOW_CLIPBOARD_ID: &str = "show_clipboard";
const QUIT_ID: &str = "quit";

fn show_window(app: &AppHandle, label: &str) {
    if let Some(window) = app.get_webview_window(label) {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

pub fn setup_tray(app: &mut App) -> Result<(), String> {
    log::info!("Setting up system tray...");

    let show_main = MenuItem::with_id(app, SHOW_MAIN_ID, "打开 ClipBridge", true, None::<&str>)
        .map_err(|e| format!("Failed to create tray menu item: {}", e))?;
    let show_clipboard =
        MenuItem::with_id(app, SHOW_CLIPBOARD_ID, "打开剪贴板", true, None::<&str>)
            .map_err(|e| format!("Failed to create tray menu item: {}", e))?;
    let separator = PredefinedMenuItem::separator(app)
        .map_err(|e| format!("Failed to create tray separator: {}", e))?;
    let quit = MenuItem::with_id(app, QUIT_ID, "退出", true, None::<&str>)
        .map_err(|e| format!("Failed to create tray menu item: {}", e))?;
    let menu = Menu::with_items(app, &[&show_main, &show_clipboard, &separator, &quit])
        .map_err(|e| format!("Failed to create tray menu: {}", e))?;

    let icon = app
        .default_window_icon()
        .cloned()
        .ok_or_else(|| "No default application icon configured".to_string())?;

    let tray_builder = TrayIconBuilder::new()
        .icon(icon)
        .tooltip("ClipBridge")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            SHOW_MAIN_ID => show_window(app, "main"),
            SHOW_CLIPBOARD_ID => show_window(app, "clipboard"),
            QUIT_ID => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_window(tray.app_handle(), "main");
            }
        });

    #[cfg(target_os = "macos")]
    let tray_builder = tray_builder.icon_as_template(true);

    let _tray = tray_builder
        .build(app.handle())
        .map_err(|e| format!("Failed to build tray: {}", e))?;

    log::info!("System tray setup completed");
    Ok(())
}
