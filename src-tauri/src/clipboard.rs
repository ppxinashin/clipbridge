use arboard::{Clipboard, ImageData};
use serde::{Deserialize, Serialize};
use std::borrow::Cow;
use std::sync::Arc;
use std::time::Duration;
use tauri::Emitter;
use tokio::sync::Mutex;
use tokio::time::interval;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClipboardItem {
    pub id: String,
    pub item_type: ClipboardItemType,
    pub content_text: Option<String>,
    pub content_html: Option<String>,
    pub image_path: Option<String>,
    pub file_path: Option<String>,
    pub source_app: String,
    pub created_at: i64,
    pub is_pinned: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ClipboardItemType {
    Text,
    RichText,
    Image,
    File,
}

pub struct ClipboardMonitor {
    clipboard: Arc<Mutex<Clipboard>>,
    last_content: Arc<Mutex<Option<String>>>,
    last_image_hash: Arc<Mutex<Option<u64>>>,
}

impl ClipboardMonitor {
    pub fn new() -> Self {
        let clipboard = Clipboard::new()
            .map_err(|e| {
                log::error!("Failed to initialize clipboard: {}", e);
                e
            })
            .expect("Failed to initialize clipboard");

        Self {
            clipboard: Arc::new(Mutex::new(clipboard)),
            last_content: Arc::new(Mutex::new(None)),
            last_image_hash: Arc::new(Mutex::new(None)),
        }
    }

    pub async fn start_monitoring(&self, app_handle: tauri::AppHandle) -> Result<(), String> {
        log::info!("Starting clipboard monitoring...");

        let mut ticker = interval(Duration::from_millis(500));
        let clipboard = self.clipboard.clone();
        let last_content = self.last_content.clone();
        let last_image_hash = self.last_image_hash.clone();

        loop {
            ticker.tick().await;

            if let Err(e) =
                Self::check_clipboard(&clipboard, &last_content, &last_image_hash, &app_handle)
                    .await
            {
                log::error!("Clipboard check error: {}", e);
            }
        }
    }

    async fn check_clipboard(
        clipboard: &Arc<Mutex<Clipboard>>,
        last_content: &Arc<Mutex<Option<String>>>,
        last_image_hash: &Arc<Mutex<Option<u64>>>,
        app_handle: &tauri::AppHandle,
    ) -> Result<(), String> {
        let mut clipboard_guard = clipboard.lock().await;

        // Try to get text first
        if let Ok(text) = clipboard_guard.get_text() {
            let mut last = last_content.lock().await;
            if last.as_ref() != Some(&text) {
                log::info!("New text detected: {}", &text[..text.len().min(50)]);

                let item = ClipboardItem {
                    id: Uuid::new_v4().to_string(),
                    item_type: ClipboardItemType::Text,
                    content_text: Some(text.clone()),
                    content_html: None,
                    image_path: None,
                    file_path: None,
                    source_app: Self::get_frontmost_app(),
                    created_at: chrono::Utc::now().timestamp(),
                    is_pinned: false,
                };

                // Emit to frontend
                app_handle
                    .emit("clipboard:new-item", &item)
                    .map_err(|e| format!("Failed to emit event: {}", e))?;

                // Save to database
                if let Err(e) = crate::db::save_clipboard_item(app_handle, &item) {
                    log::error!("Failed to save clipboard item: {}", e);
                }

                *last = Some(text);
            }
            return Ok(());
        }

        // Try to get image
        if let Ok(image) = clipboard_guard.get_image() {
            let image_hash = Self::hash_image(&image);
            let mut last_hash = last_image_hash.lock().await;

            if *last_hash != Some(image_hash) {
                log::info!(
                    "New image detected: {}x{} pixels",
                    image.width,
                    image.height
                );

                // Save image to disk
                let image_path = Self::save_image_to_disk(&image, app_handle)?;

                let item = ClipboardItem {
                    id: Uuid::new_v4().to_string(),
                    item_type: ClipboardItemType::Image,
                    content_text: Some(format!("[图片] {}x{} 像素", image.width, image.height)),
                    content_html: None,
                    image_path: Some(image_path),
                    file_path: None,
                    source_app: Self::get_frontmost_app(),
                    created_at: chrono::Utc::now().timestamp(),
                    is_pinned: false,
                };

                app_handle
                    .emit("clipboard:new-item", &item)
                    .map_err(|e| format!("Failed to emit event: {}", e))?;

                if let Err(e) = crate::db::save_clipboard_item(app_handle, &item) {
                    log::error!("Failed to save clipboard item: {}", e);
                }

                *last_hash = Some(image_hash);
            }
            return Ok(());
        }

        Ok(())
    }

    fn hash_image(image: &ImageData) -> u64 {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};

        let mut hasher = DefaultHasher::new();
        image.bytes.hash(&mut hasher);
        image.width.hash(&mut hasher);
        image.height.hash(&mut hasher);
        hasher.finish()
    }

    fn save_image_to_disk(
        image: &ImageData,
        _app_handle: &tauri::AppHandle,
    ) -> Result<String, String> {
        use directories::ProjectDirs;
        use std::fs;

        let project_dirs = ProjectDirs::from("com", "clipbridge", "ClipBridge")
            .ok_or("Failed to get project dirs")?;

        let attachments_dir = project_dirs.data_dir().join("attachments");
        let today_dir = attachments_dir.join(chrono::Local::now().format("%Y-%m-%d").to_string());

        fs::create_dir_all(&today_dir).map_err(|e| format!("Failed to create dir: {}", e))?;

        let filename = format!("image_{}.png", Uuid::new_v4());
        let filepath = today_dir.join(&filename);

        // Convert to PNG and save
        let img = image::RgbaImage::from_raw(
            image.width as u32,
            image.height as u32,
            image.bytes.to_vec(),
        )
        .ok_or("Failed to create image from raw data")?;

        img.save(&filepath)
            .map_err(|e| format!("Failed to save image: {}", e))?;

        Ok(filepath.to_string_lossy().to_string())
    }

    fn get_frontmost_app() -> String {
        // TODO: Get actual frontmost application name
        // For now, return a placeholder
        "Unknown".to_string()
    }

    pub async fn copy_to_clipboard(&self, content: &str) -> Result<(), String> {
        let mut clipboard = self.clipboard.lock().await;
        clipboard
            .set_text(content)
            .map_err(|e| format!("Failed to set clipboard: {}", e))
    }

    pub async fn copy_image_to_clipboard(&self, image_path: &str) -> Result<(), String> {
        let image = image::open(image_path)
            .map_err(|e| format!("Failed to open clipboard image: {}", e))?
            .into_rgba8();
        let (width, height) = image.dimensions();
        let mut clipboard = self.clipboard.lock().await;

        clipboard
            .set_image(ImageData {
                width: width as usize,
                height: height as usize,
                bytes: Cow::Owned(image.into_raw()),
            })
            .map_err(|e| format!("Failed to set clipboard image: {}", e))
    }
}
