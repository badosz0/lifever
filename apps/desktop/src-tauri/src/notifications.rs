use serde::Deserialize;

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
    cancel_ids: Vec<String>,
    notifications: Vec<ScheduledNotification>,
}

pub fn initialize() {
    #[cfg(target_os = "macos")]
    macos::initialize();
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
