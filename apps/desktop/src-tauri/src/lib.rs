mod notifications;

use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Emitter, Manager,
};

const MENU_BAR_TRAY_ID: &str = "lifever-menubar";
const MENU_BAR_EVENT_ID: &str = "open-upcoming-event";

struct MenuBarState {
    event_id: Mutex<Option<String>>,
    event_item: MenuItem<tauri::Wry>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct MenuBarEvent {
    id: String,
    menu_label: String,
    status_label: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct OpenAppRequest {
    app: &'static str,
    event_id: String,
}

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

fn open_calendar(app: &tauri::AppHandle, event_id: String) -> Result<(), String> {
    let main_window = app
        .get_webview_window("main")
        .ok_or_else(|| "main window is unavailable".to_string())?;
    main_window.show().map_err(|error| error.to_string())?;
    if main_window.is_minimized().unwrap_or(false) {
        main_window
            .unminimize()
            .map_err(|error| error.to_string())?;
    }
    main_window
        .emit(
            "lifever:open-app",
            OpenAppRequest {
                app: "calendar",
                event_id,
            },
        )
        .map_err(|error| error.to_string())?;
    main_window.set_focus().map_err(|error| error.to_string())
}

#[tauri::command]
fn close_oauth_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("oauth") {
        window.close().map_err(|error| error.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn sync_menu_bar_event(
    app: tauri::AppHandle,
    state: tauri::State<'_, MenuBarState>,
    event: Option<MenuBarEvent>,
) -> Result<(), String> {
    let tray = app
        .tray_by_id(MENU_BAR_TRAY_ID)
        .ok_or_else(|| "menu bar item is unavailable".to_string())?;

    if let Some(event) = event {
        tray.set_title(Some(&event.status_label))
            .map_err(|error| error.to_string())?;
        state
            .event_item
            .set_text(event.menu_label)
            .map_err(|error| error.to_string())?;
        state
            .event_item
            .set_enabled(true)
            .map_err(|error| error.to_string())?;
        *state
            .event_id
            .lock()
            .map_err(|_| "menu bar event state is unavailable".to_string())? = Some(event.id);
    } else {
        tray.set_title(None::<&str>)
            .map_err(|error| error.to_string())?;
        state
            .event_item
            .set_text("No upcoming events")
            .map_err(|error| error.to_string())?;
        state
            .event_item
            .set_enabled(false)
            .map_err(|error| error.to_string())?;
        *state
            .event_id
            .lock()
            .map_err(|_| "menu bar event state is unavailable".to_string())? = None;
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
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
            let main_window = tauri::WebviewWindowBuilder::from_config(app, main_window)?
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

            #[cfg(target_os = "macos")]
            {
                let window_to_hide = main_window.clone();
                main_window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = window_to_hide.hide();
                    }
                });
            }

            let event_item = MenuItem::with_id(
                app,
                MENU_BAR_EVENT_ID,
                "No upcoming events",
                false,
                None::<&str>,
            )?;
            let tray_menu = Menu::with_items(app, &[&event_item])?;
            let tray_icon = Image::new(include_bytes!("../icons/tray-icon.rgba"), 32, 32);
            app.manage(MenuBarState {
                event_id: Mutex::new(None),
                event_item: event_item.clone(),
            });

            TrayIconBuilder::with_id(MENU_BAR_TRAY_ID)
                .icon(tray_icon)
                .icon_as_template(true)
                .tooltip("Lifever")
                .menu(&tray_menu)
                .on_menu_event(|app, event| {
                    if event.id().as_ref() == MENU_BAR_EVENT_ID {
                        let event_id = app
                            .state::<MenuBarState>()
                            .event_id
                            .lock()
                            .ok()
                            .and_then(|event_id| event_id.clone());
                        if let Some(event_id) = event_id {
                            let _ = open_calendar(app, event_id);
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            close_oauth_window,
            sync_menu_bar_event,
            notifications::sync_native_notifications
        ])
        .build(tauri::generate_context!())
        .expect("error while running Lifever");

    app.run(|app_handle, event| {
        #[cfg(target_os = "macos")]
        if let tauri::RunEvent::Reopen {
            has_visible_windows: false,
            ..
        } = event
        {
            if let Some(main_window) = app_handle.get_webview_window("main") {
                let _ = main_window.show();
                let _ = main_window.set_focus();
            }
        }
    });
}
