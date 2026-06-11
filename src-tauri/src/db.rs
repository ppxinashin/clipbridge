use crate::clipboard::{ClipboardItem, ClipboardItemType};
use base64::{engine::general_purpose::STANDARD as BASE64_STANDARD, Engine as _};
use directories::ProjectDirs;
use rusqlite::{params, Connection, Result as SqliteResult};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Note {
    pub id: String,
    pub title: String,
    pub content_markdown: String,
    pub content_html: Option<String>,
    pub tags: Vec<String>,
    pub color: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Attachment {
    pub id: String,
    pub note_id: String,
    pub file_name: String,
    pub file_path: String,
    pub file_size: i64,
    pub created_at: i64,
}

pub fn init_db(app_handle: &tauri::AppHandle) -> Result<(), String> {
    let db_path = get_db_path(app_handle)?;
    log::info!("Initializing database at: {:?}", db_path);

    let conn = Connection::open(&db_path).map_err(|e| format!("Failed to open database: {}", e))?;

    // Create clipboard_history table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS clipboard_history (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            content_text TEXT,
            content_html TEXT,
            image_path TEXT,
            file_path TEXT,
            source_app TEXT,
            created_at INTEGER NOT NULL,
            is_pinned INTEGER DEFAULT 0
        )",
        [],
    )
    .map_err(|e| format!("Failed to create clipboard_history table: {}", e))?;

    // Create notes table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS notes (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            content_markdown TEXT NOT NULL,
            content_html TEXT,
            tags TEXT,
            color TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )",
        [],
    )
    .map_err(|e| format!("Failed to create notes table: {}", e))?;

    // Create attachments table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS attachments (
            id TEXT PRIMARY KEY,
            note_id TEXT NOT NULL,
            file_name TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_size INTEGER,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
        )",
        [],
    )
    .map_err(|e| format!("Failed to create attachments table: {}", e))?;

    // Create index for faster queries
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_clipboard_created_at ON clipboard_history(created_at DESC)",
        [],
    )
    .ok();

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC)",
        [],
    )
    .ok();

    log::info!("Database initialized successfully");
    Ok(())
}

fn get_db_path(_app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let project_dirs = ProjectDirs::from("com", "clipbridge", "ClipBridge")
        .ok_or("Failed to get project directories")?;

    let data_dir = project_dirs.data_dir();
    fs::create_dir_all(data_dir).map_err(|e| format!("Failed to create data directory: {}", e))?;

    Ok(data_dir.join("clipbridge.db"))
}

pub fn save_clipboard_item(
    app_handle: &tauri::AppHandle,
    item: &ClipboardItem,
) -> Result<(), String> {
    let db_path = get_db_path(app_handle)?;
    let conn = Connection::open(&db_path).map_err(|e| format!("Failed to open database: {}", e))?;

    let item_type = match item.item_type {
        ClipboardItemType::Text => "text",
        ClipboardItemType::RichText => "rich",
        ClipboardItemType::Image => "image",
        ClipboardItemType::File => "file",
    };

    conn.execute(
        "INSERT OR REPLACE INTO clipboard_history (
            id, type, content_text, content_html, image_path, file_path, source_app, created_at, is_pinned
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            item.id,
            item_type,
            item.content_text,
            item.content_html,
            item.image_path,
            item.file_path,
            item.source_app,
            item.created_at,
            if item.is_pinned { 1 } else { 0 }
        ],
    )
    .map_err(|e| format!("Failed to insert clipboard item: {}", e))?;

    // Clean up old items (keep only last 100 by default)
    conn.execute(
        "DELETE FROM clipboard_history 
         WHERE id NOT IN (
             SELECT id FROM clipboard_history 
             ORDER BY created_at DESC 
             LIMIT 100
         ) AND is_pinned = 0",
        [],
    )
    .ok();

    Ok(())
}

pub fn get_clipboard_history(
    app_handle: &tauri::AppHandle,
    limit: i64,
) -> Result<Vec<ClipboardItem>, String> {
    let db_path = get_db_path(app_handle)?;
    let conn = Connection::open(&db_path).map_err(|e| format!("Failed to open database: {}", e))?;

    let mut stmt = conn
        .prepare(
            "SELECT id, type, content_text, content_html, image_path, file_path, source_app, created_at, is_pinned
             FROM clipboard_history 
             ORDER BY created_at DESC 
             LIMIT ?",
        )
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let items = stmt
        .query_map(params![limit], |row| {
            let item_type: String = row.get(1)?;
            let item_type = match item_type.as_str() {
                "text" => ClipboardItemType::Text,
                "rich" => ClipboardItemType::RichText,
                "image" => ClipboardItemType::Image,
                "file" => ClipboardItemType::File,
                _ => ClipboardItemType::Text,
            };

            Ok(ClipboardItem {
                id: row.get(0)?,
                item_type,
                content_text: row.get(2)?,
                content_html: row.get(3)?,
                image_path: row.get(4)?,
                file_path: row.get(5)?,
                source_app: row.get(6)?,
                created_at: row.get(7)?,
                is_pinned: row.get::<_, i64>(8)? != 0,
            })
        })
        .map_err(|e| format!("Failed to query items: {}", e))?;

    items
        .collect::<SqliteResult<Vec<_>>>()
        .map_err(|e| format!("Failed to collect items: {}", e))
}

pub fn get_clipboard_item(
    app_handle: &tauri::AppHandle,
    item_id: &str,
) -> Result<ClipboardItem, String> {
    let db_path = get_db_path(app_handle)?;
    let conn = Connection::open(&db_path).map_err(|e| format!("Failed to open database: {}", e))?;

    conn.query_row(
        "SELECT id, type, content_text, content_html, image_path, file_path, source_app, created_at, is_pinned
         FROM clipboard_history WHERE id = ?",
        params![item_id],
        |row| {
            let item_type: String = row.get(1)?;
            let item_type = match item_type.as_str() {
                "rich" => ClipboardItemType::RichText,
                "image" => ClipboardItemType::Image,
                "file" => ClipboardItemType::File,
                _ => ClipboardItemType::Text,
            };

            Ok(ClipboardItem {
                id: row.get(0)?,
                item_type,
                content_text: row.get(2)?,
                content_html: row.get(3)?,
                image_path: row.get(4)?,
                file_path: row.get(5)?,
                source_app: row.get(6)?,
                created_at: row.get(7)?,
                is_pinned: row.get::<_, i64>(8)? != 0,
            })
        },
    )
    .map_err(|e| format!("Failed to get clipboard item: {}", e))
}

pub fn pin_to_note(app_handle: &tauri::AppHandle, item_id: &str) -> Result<String, String> {
    let db_path = get_db_path(app_handle)?;
    let conn = Connection::open(&db_path).map_err(|e| format!("Failed to open database: {}", e))?;

    // Get the clipboard item
    let mut stmt = conn
        .prepare(
            "SELECT type, content_text, content_html, image_path, file_path, source_app 
             FROM clipboard_history WHERE id = ?",
        )
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let item = stmt
        .query_row(params![item_id], |row| {
            let item_type: String = row.get(0)?;
            let content_text: Option<String> = row.get(1)?;
            let image_path: Option<String> = row.get(3)?;

            // Generate title from first 20 chars of content
            let title = content_text
                .as_ref()
                .map(|t| t.chars().take(20).collect())
                .unwrap_or_else(|| "Untitled".to_string());

            Ok((title, item_type, content_text, image_path))
        })
        .map_err(|e| format!("Failed to get clipboard item: {}", e))?;

    // Create note from clipboard item
    let note_id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().timestamp();

    let (title, item_type, content_text, image_path) = item;
    let content = if item_type == "image" {
        let image_alt = title.replace(['[', ']', '\n', '\r'], "");
        image_path
            .and_then(|path| fs::read(path).ok())
            .map(|bytes| {
                format!(
                    "![{}](data:image/png;base64,{})",
                    image_alt,
                    BASE64_STANDARD.encode(bytes)
                )
            })
            .unwrap_or_else(|| content_text.unwrap_or_default())
    } else {
        content_text.unwrap_or_default()
    };

    conn.execute(
        "INSERT INTO notes (id, title, content_markdown, content_html, tags, color, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            note_id,
            title,
            content,
            None::<String>,
            "[]",
            None::<String>,
            now,
            now
        ],
    )
    .map_err(|e| format!("Failed to create note: {}", e))?;

    // Mark clipboard item as pinned
    conn.execute(
        "UPDATE clipboard_history SET is_pinned = 1 WHERE id = ?",
        params![item_id],
    )
    .map_err(|e| format!("Failed to mark as pinned: {}", e))?;

    Ok(note_id)
}

pub fn get_notes(
    app_handle: &tauri::AppHandle,
    _tag: Option<String>,
    _color: Option<String>,
) -> Result<Vec<Note>, String> {
    let db_path = get_db_path(app_handle)?;
    let conn = Connection::open(&db_path).map_err(|e| format!("Failed to open database: {}", e))?;

    let mut stmt = conn
        .prepare(
            "SELECT id, title, content_markdown, content_html, tags, color, created_at, updated_at
             FROM notes 
             ORDER BY updated_at DESC",
        )
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let notes = stmt
        .query_map([], |row| {
            let tags_json: String = row.get(4).unwrap_or_default();
            let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_else(|_| Vec::new());

            Ok(Note {
                id: row.get(0)?,
                title: row.get(1)?,
                content_markdown: row.get(2)?,
                content_html: row.get(3)?,
                tags,
                color: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })
        .map_err(|e| format!("Failed to query notes: {}", e))?;

    notes
        .collect::<SqliteResult<Vec<_>>>()
        .map_err(|e| format!("Failed to collect notes: {}", e))
}

pub fn save_note(app_handle: &tauri::AppHandle, note: &Note) -> Result<String, String> {
    let db_path = get_db_path(app_handle)?;
    let conn = Connection::open(&db_path).map_err(|e| format!("Failed to open database: {}", e))?;

    let note_id = if note.id.is_empty() {
        Uuid::new_v4().to_string()
    } else {
        note.id.clone()
    };

    let now = chrono::Utc::now().timestamp();
    let tags_json = serde_json::to_string(&note.tags).unwrap_or_else(|_| "[]".to_string());

    conn.execute(
        "INSERT OR REPLACE INTO notes (id, title, content_markdown, content_html, tags, color, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            note_id,
            note.title,
            note.content_markdown,
            note.content_html,
            tags_json,
            note.color,
            if note.id.is_empty() { now } else { note.created_at },
            now
        ],
    )
    .map_err(|e| format!("Failed to save note: {}", e))?;

    Ok(note_id)
}

pub fn delete_note(app_handle: &tauri::AppHandle, note_id: &str) -> Result<(), String> {
    let db_path = get_db_path(app_handle)?;
    let conn = Connection::open(&db_path).map_err(|e| format!("Failed to open database: {}", e))?;

    conn.execute("DELETE FROM notes WHERE id = ?", params![note_id])
        .map_err(|e| format!("Failed to delete note: {}", e))?;

    Ok(())
}

pub fn export_notes(
    _app_handle: &tauri::AppHandle,
    _note_ids: Option<Vec<String>>,
) -> Result<String, String> {
    // TODO: Implement export functionality
    Ok("/path/to/export.zip".to_string())
}

pub fn import_notes(_app_handle: &tauri::AppHandle, _zip_path: &str) -> Result<usize, String> {
    // TODO: Implement import functionality
    Ok(0)
}
