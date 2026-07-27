use std::{
    cell::Cell,
    path::Path,
    ptr::NonNull,
    sync::{mpsc, OnceLock},
    thread,
    time::{SystemTime, UNIX_EPOCH},
};

use block2::RcBlock;
use futures_channel::oneshot;
use objc2::{
    define_class,
    rc::Retained,
    runtime::{Bool, ProtocolObject},
    AnyThread,
};
use objc2_foundation::{NSArray, NSError, NSObject, NSObjectProtocol, NSString};
use objc2_user_notifications::{
    UNAuthorizationOptions, UNMutableNotificationContent, UNNotification,
    UNNotificationPresentationOptions, UNNotificationRequest, UNNotificationSound,
    UNTimeIntervalNotificationTrigger, UNUserNotificationCenter, UNUserNotificationCenterDelegate,
};

use super::{NotificationSyncRequest, ScheduledNotification};

type Task = Box<dyn FnOnce() + Send + 'static>;

static WORKER: OnceLock<mpsc::Sender<Task>> = OnceLock::new();
static AVAILABLE: OnceLock<bool> = OnceLock::new();

fn is_app_bundle_executable(path: &Path) -> bool {
    path.ancestors().any(|ancestor| {
        ancestor
            .extension()
            .and_then(|extension| extension.to_str())
            .is_some_and(|extension| extension.eq_ignore_ascii_case("app"))
    })
}

fn is_available() -> bool {
    *AVAILABLE.get_or_init(|| {
        std::env::current_exe()
            .ok()
            .is_some_and(|executable| is_app_bundle_executable(&executable))
    })
}

define_class!(
    #[unsafe(super(NSObject))]
    #[name = "LifeverNotificationDelegate"]
    struct NotificationDelegate;

    unsafe impl NSObjectProtocol for NotificationDelegate {}

    unsafe impl UNUserNotificationCenterDelegate for NotificationDelegate {
        #[unsafe(method(userNotificationCenter:willPresentNotification:withCompletionHandler:))]
        fn will_present_notification(
            &self,
            _center: &UNUserNotificationCenter,
            _notification: &UNNotification,
            completion_handler: &block2::DynBlock<dyn Fn(UNNotificationPresentationOptions)>,
        ) {
            completion_handler.call((UNNotificationPresentationOptions::Banner
                | UNNotificationPresentationOptions::Sound,));
        }
    }
);

impl NotificationDelegate {
    fn new() -> Retained<Self> {
        let this = Self::alloc().set_ivars(());
        unsafe { objc2::msg_send![super(this), init] }
    }
}

pub fn initialize() {
    // macOS raises an Objective-C exception if UNUserNotificationCenter is used
    // by Tauri's raw `target/debug` executable. Packaged `.app` processes have
    // the bundle metadata that the notification center requires.
    if !is_available() {
        return;
    }

    static DELEGATE: OnceLock<Retained<NotificationDelegate>> = OnceLock::new();

    DELEGATE.get_or_init(|| {
        let delegate = NotificationDelegate::new();
        UNUserNotificationCenter::currentNotificationCenter()
            .setDelegate(Some(ProtocolObject::from_ref(&*delegate)));
        delegate
    });
}

fn worker() -> &'static mpsc::Sender<Task> {
    WORKER.get_or_init(|| {
        let (sender, receiver) = mpsc::channel::<Task>();
        thread::Builder::new()
            .name("lifever-notifications".into())
            .spawn(move || {
                for task in receiver {
                    task();
                }
            })
            .expect("failed to start notification worker");
        sender
    })
}

fn dispatch(task: impl FnOnce() + Send + 'static) -> Result<(), String> {
    worker()
        .send(Box::new(task))
        .map_err(|_| "notification worker is unavailable".to_owned())
}

fn cancel(center: &UNUserNotificationCenter, identifiers: Vec<String>) {
    if identifiers.is_empty() {
        return;
    }

    let identifiers = identifiers
        .iter()
        .map(|identifier| NSString::from_str(identifier))
        .collect::<Vec<_>>();
    let identifiers = NSArray::from_retained_slice(&identifiers);
    center.removePendingNotificationRequestsWithIdentifiers(&identifiers);
    center.removeDeliveredNotificationsWithIdentifiers(&identifiers);
}

fn schedule(center: &UNUserNotificationCenter, notification: ScheduledNotification) {
    let now_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs_f64()
        * 1_000.0;
    let delay_seconds = ((notification.deliver_at_ms - now_ms) / 1_000.0).max(0.1);

    let content = UNMutableNotificationContent::new();
    content.setTitle(&NSString::from_str(&notification.title));
    if let Some(body) = notification.body {
        content.setBody(&NSString::from_str(&body));
    }
    if let Some(thread_id) = notification.thread_id {
        content.setThreadIdentifier(&NSString::from_str(&thread_id));
    }
    if notification.sound {
        content.setSound(Some(&UNNotificationSound::defaultSound()));
    }

    let trigger =
        UNTimeIntervalNotificationTrigger::triggerWithTimeInterval_repeats(delay_seconds, false);
    let request = UNNotificationRequest::requestWithIdentifier_content_trigger(
        &NSString::from_str(&notification.id),
        &content,
        Some(&trigger),
    );
    center.addNotificationRequest_withCompletionHandler(&request, None);
}

pub async fn sync(request: NotificationSyncRequest) -> Result<bool, String> {
    if !is_available() {
        return Ok(false);
    }

    let (sender, receiver) = oneshot::channel::<Result<bool, String>>();

    dispatch(move || {
        let NotificationSyncRequest {
            clear_all,
            cancel_ids,
            notifications,
        } = request;
        let center = UNUserNotificationCenter::currentNotificationCenter();
        if clear_all {
            center.removeAllPendingNotificationRequests();
            center.removeAllDeliveredNotifications();
        } else {
            cancel(&center, cancel_ids);
        }

        if notifications.is_empty() {
            let _ = sender.send(Ok(true));
            return;
        }

        let sender = Cell::new(Some(sender));
        let notifications = Cell::new(Some(notifications));
        center.requestAuthorizationWithOptions_completionHandler(
            UNAuthorizationOptions::Alert | UNAuthorizationOptions::Sound,
            &RcBlock::new(move |granted: Bool, error: *mut NSError| {
                let Some(sender) = sender.take() else {
                    return;
                };
                let result = if let Some(error) = NonNull::new(error) {
                    let description = unsafe { error.as_ref() }.localizedDescription().to_string();
                    Err(format!(
                        "macOS rejected the notification permission request: {description}"
                    ))
                } else if !granted.as_bool() {
                    Ok(false)
                } else {
                    let center = UNUserNotificationCenter::currentNotificationCenter();
                    for notification in notifications.take().unwrap_or_default() {
                        schedule(&center, notification);
                    }
                    Ok(true)
                };

                let _ = sender.send(result);
            }),
        );
    })?;

    receiver
        .await
        .map_err(|_| "notification worker stopped before finishing".to_owned())?
}

#[cfg(test)]
mod tests {
    use super::is_app_bundle_executable;
    use std::path::Path;

    #[test]
    fn recognizes_a_packaged_macos_executable() {
        assert!(is_app_bundle_executable(Path::new(
            "/Applications/Lifever.app/Contents/MacOS/lifever"
        )));
    }

    #[test]
    fn rejects_a_tauri_dev_executable() {
        assert!(!is_app_bundle_executable(Path::new(
            "/workspace/apps/desktop/src-tauri/target/debug/lifever"
        )));
    }
}
