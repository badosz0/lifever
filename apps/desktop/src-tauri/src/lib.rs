mod notifications;

fn is_allowed_oauth_popup(url: &tauri::Url) -> bool {
    if url.path() != "/api/auth/oauth-popup/start" {
        return false;
    }

    matches!(
        (url.scheme(), url.host_str()),
        ("https", Some("lifever-api.badoszk.workers.dev"))
            | ("https", Some("api.lifever.app"))
            | ("http", Some("localhost"))
            | ("http", Some("127.0.0.1"))
    )
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            notifications::initialize();

            let main_window = app
                .config()
                .app
                .windows
                .iter()
                .find(|window| window.label == "main")
                .ok_or_else(|| std::io::Error::other("main window configuration is missing"))?;

            tauri::WebviewWindowBuilder::from_config(app, main_window)?
                .on_new_window(|url, _| {
                    if is_allowed_oauth_popup(&url) {
                        tauri::webview::NewWindowResponse::Allow
                    } else {
                        tauri::webview::NewWindowResponse::Deny
                    }
                })
                .build()?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            notifications::sync_native_notifications
        ])
        .run(tauri::generate_context!())
        .expect("error while running Lifever");
}
