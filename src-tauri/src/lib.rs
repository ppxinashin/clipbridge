pub mod clipboard;
pub mod commands;
pub mod db;
pub mod shortcut;
pub mod tray;

pub use clipboard::ClipboardMonitor;
use std::sync::Arc;

pub struct AppState {
    pub clipboard_monitor: Arc<ClipboardMonitor>,
}
