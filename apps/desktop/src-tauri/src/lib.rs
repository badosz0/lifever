mod notifications;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|_| {
            notifications::initialize();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            notifications::sync_native_notifications
        ])
        .run(tauri::generate_context!())
        .expect("error while running Lifever");
}
