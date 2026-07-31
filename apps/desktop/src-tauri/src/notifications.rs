use serde::{Deserialize, Serialize};

#[cfg(target_os = "macos")]
mod macos;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScheduledNotification {
    id: String,
    title: String,
    body: Option<String>,
    deliver_at_ms: f64,
    thread_id: Option<String>,
    sound: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationSyncRequest {
    #[serde(default)]
    clear_all: bool,
    cancel_ids: Vec<String>,
    notifications: Vec<ScheduledNotification>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationOpenTarget {
    kind: String,
    id: String,
}

pub fn initialize(app: tauri::AppHandle) {
    #[cfg(target_os = "macos")]
    macos::initialize(app);

    #[cfg(not(target_os = "macos"))]
    let _ = app;
}

#[tauri::command]
pub fn take_pending_notification_opens() -> Vec<NotificationOpenTarget> {
    #[cfg(target_os = "macos")]
    return macos::take_pending_opens();

    #[cfg(not(target_os = "macos"))]
    Vec::new()
}

#[tauri::command]
pub async fn sync_native_notifications(request: NotificationSyncRequest) -> Result<bool, String> {
    #[cfg(target_os = "macos")]
    return macos::sync(request).await;

    #[cfg(not(target_os = "macos"))]
    {
        let _ = request;
        Ok(false)
    }
}
