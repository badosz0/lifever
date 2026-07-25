mod notifications;

use tauri::Manager;

fn is_allowed_oauth_popup(url: &tauri::Url) -> bool {
    if url.path() != "/api/auth/oauth-popup/start" {
        return false;
    }

    let production_origin = matches!(
        (url.scheme(), url.host_str()),
        ("https", Some("lifever-api.badoszk.workers.dev")) | ("https", Some("api.lifever.app"))
    );
    let local_origin = matches!(
        (url.scheme(), url.host_str(), url.port_or_known_default()),
        ("http", Some("localhost" | "127.0.0.1"), Some(8787))
    );

    production_origin || local_origin
}

#[tauri::command]
fn close_oauth_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("oauth") {
        window.close().map_err(|error| error.to_string())?;
    }
    Ok(())
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

            let app_handle = app.handle().clone();
            tauri::WebviewWindowBuilder::from_config(app, main_window)?
                .on_new_window(move |url, features| {
                    if !is_allowed_oauth_popup(&url) {
                        return tauri::webview::NewWindowResponse::Deny;
                    }

                    if let Some(existing) = app_handle.get_webview_window("oauth") {
                        let _ = existing.close();
                    }

                    let popup = tauri::WebviewWindowBuilder::new(
                        &app_handle,
                        "oauth",
                        tauri::WebviewUrl::External(
                            "about:blank".parse().expect("about:blank is a valid URL"),
                        ),
                    )
                    .title("Sign in to Lifever")
                    .window_features(features)
                    .build();

                    match popup {
                        Ok(window) => tauri::webview::NewWindowResponse::Create { window },
                        Err(error) => {
                            eprintln!("failed to create OAuth window: {error}");
                            tauri::webview::NewWindowResponse::Deny
                        }
                    }
                })
                .build()?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            close_oauth_window,
            notifications::sync_native_notifications
        ])
        .run(tauri::generate_context!())
        .expect("error while running Lifever");
}
