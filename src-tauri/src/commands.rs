use crate::clipboard::ClipboardItem;
use crate::db::{self, Note};
use crate::{shortcut, AppState};
use serde::{Deserialize, Serialize};
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

impl<T> ApiResponse<T> {
    pub fn ok(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
        }
    }

    pub fn err(error: String) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(error),
        }
    }
}

#[tauri::command]
pub async fn get_clipboard_history(
    limit: Option<i64>,
    app_handle: tauri::AppHandle,
) -> Result<ApiResponse<Vec<ClipboardItem>>, String> {
    let limit = limit.unwrap_or(100);

    match db::get_clipboard_history(&app_handle, limit) {
        Ok(items) => Ok(ApiResponse::ok(items)),
        Err(e) => Ok(ApiResponse::err(format!("Failed to get history: {}", e))),
    }
}

#[tauri::command]
pub async fn copy_to_clipboard(
    content: String,
    state: tauri::State<'_, AppState>,
) -> Result<ApiResponse<()>, String> {
    match state.clipboard_monitor.copy_to_clipboard(&content).await {
        Ok(_) => Ok(ApiResponse::ok(())),
        Err(e) => Ok(ApiResponse::err(e)),
    }
}

#[tauri::command]
pub async fn copy_clipboard_item(
    item_id: String,
    state: tauri::State<'_, AppState>,
    app_handle: tauri::AppHandle,
) -> Result<ApiResponse<()>, String> {
    let item = match db::get_clipboard_item(&app_handle, &item_id) {
        Ok(item) => item,
        Err(error) => return Ok(ApiResponse::err(error)),
    };

    let result = match item.item_type {
        crate::clipboard::ClipboardItemType::Image => match item.image_path {
            Some(path) => state.clipboard_monitor.copy_image_to_clipboard(&path).await,
            None => Err("Clipboard image file is missing".to_string()),
        },
        _ => {
            state
                .clipboard_monitor
                .copy_to_clipboard(item.content_text.as_deref().unwrap_or_default())
                .await
        }
    };

    match result {
        Ok(_) => Ok(ApiResponse::ok(())),
        Err(error) => Ok(ApiResponse::err(error)),
    }
}

#[tauri::command]
pub async fn pin_to_note(
    item_id: String,
    app_handle: tauri::AppHandle,
) -> Result<ApiResponse<String>, String> {
    match db::pin_to_note(&app_handle, &item_id) {
        Ok(note_id) => Ok(ApiResponse::ok(note_id)),
        Err(e) => Ok(ApiResponse::err(format!("Failed to pin item: {}", e))),
    }
}

#[tauri::command]
pub async fn get_notes(
    tag: Option<String>,
    color: Option<String>,
    app_handle: tauri::AppHandle,
) -> Result<ApiResponse<Vec<Note>>, String> {
    match db::get_notes(&app_handle, tag, color) {
        Ok(notes) => Ok(ApiResponse::ok(notes)),
        Err(e) => Ok(ApiResponse::err(format!("Failed to get notes: {}", e))),
    }
}

#[tauri::command]
pub async fn save_note(
    note: Note,
    app_handle: tauri::AppHandle,
) -> Result<ApiResponse<String>, String> {
    match db::save_note(&app_handle, &note) {
        Ok(id) => Ok(ApiResponse::ok(id)),
        Err(e) => Ok(ApiResponse::err(format!("Failed to save note: {}", e))),
    }
}

#[tauri::command]
pub async fn delete_note(
    note_id: String,
    app_handle: tauri::AppHandle,
) -> Result<ApiResponse<()>, String> {
    match db::delete_note(&app_handle, &note_id) {
        Ok(_) => Ok(ApiResponse::ok(())),
        Err(e) => Ok(ApiResponse::err(format!("Failed to delete note: {}", e))),
    }
}

#[tauri::command]
pub async fn export_notes(
    note_ids: Option<Vec<String>>,
    app_handle: tauri::AppHandle,
) -> Result<ApiResponse<String>, String> {
    match db::export_notes(&app_handle, note_ids) {
        Ok(path) => Ok(ApiResponse::ok(path)),
        Err(e) => Ok(ApiResponse::err(format!("Failed to export notes: {}", e))),
    }
}

#[tauri::command]
pub async fn import_notes(
    zip_path: String,
    app_handle: tauri::AppHandle,
) -> Result<ApiResponse<usize>, String> {
    match db::import_notes(&app_handle, &zip_path) {
        Ok(count) => Ok(ApiResponse::ok(count)),
        Err(e) => Ok(ApiResponse::err(format!("Failed to import notes: {}", e))),
    }
}

#[tauri::command]
pub fn show_clipboard_window(app_handle: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("clipboard") {
        window
            .show()
            .map_err(|e| format!("Failed to show window: {}", e))?;
        window
            .set_focus()
            .map_err(|e| format!("Failed to focus window: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
pub fn hide_clipboard_window(app_handle: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("clipboard") {
        window
            .hide()
            .map_err(|e| format!("Failed to hide window: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
pub fn get_global_shortcut() -> ApiResponse<String> {
    ApiResponse::ok(shortcut::load_shortcut())
}

#[tauri::command]
pub fn set_global_shortcut(
    shortcut_value: String,
    app_handle: tauri::AppHandle,
) -> ApiResponse<String> {
    match shortcut::update_shortcut(&app_handle, &shortcut_value) {
        Ok(shortcut) => ApiResponse::ok(shortcut),
        Err(error) => ApiResponse::err(error),
    }
}
