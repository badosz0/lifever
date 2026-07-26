use serde::Serialize;
use serde_json::{json, Value};
use std::{
    collections::{BTreeMap, HashMap},
    env,
    fs::{self, File},
    io::{BufRead, BufReader, Read, Seek, SeekFrom, Write},
    path::{Path, PathBuf},
    process::{Child, ChildStdin, Command, Stdio},
    sync::mpsc::{self, Receiver},
    thread,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

const HISTORY_DAYS: u64 = 30;
const FIRST_READ_BYTES: u64 = 512 * 1024;
const TAIL_READ_BYTES: u64 = 128 * 1024;
const MAX_RECENT_SESSIONS: usize = 7;
const CHATGPT_USAGE_URL: &str = "https://chatgpt.com/backend-api/wham/usage";
const UNKNOWN_MODEL: &str = "Unknown model";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiUsageDashboard {
    collected_at: u64,
    plan: Option<String>,
    limits: Vec<AiRateLimit>,
    credits: Option<AiCredits>,
    summary: AiTokenSummary,
    daily: Vec<AiDailyUsage>,
    models: Vec<AiModelUsage>,
    projects: Vec<AiProjectUsage>,
    recent_sessions: Vec<AiRecentSession>,
    source: AiUsageSource,
    warning: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AiRateLimit {
    id: String,
    label: String,
    used_percent: f64,
    remaining_percent: f64,
    window_minutes: Option<u64>,
    resets_at: Option<u64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AiCredits {
    has_credits: bool,
    unlimited: bool,
    balance: Option<String>,
}

#[derive(Default, Serialize)]
#[serde(rename_all = "camelCase")]
struct AiTokenSummary {
    input_tokens: u64,
    cached_input_tokens: u64,
    output_tokens: u64,
    total_tokens: u64,
    session_count: usize,
    active_days: usize,
    history_days: u64,
}

#[derive(Default, Serialize)]
#[serde(rename_all = "camelCase")]
struct AiDailyUsage {
    date: String,
    input_tokens: u64,
    cached_input_tokens: u64,
    output_tokens: u64,
    total_tokens: u64,
    sessions: usize,
}

#[derive(Default, Serialize)]
#[serde(rename_all = "camelCase")]
struct AiModelUsage {
    model: String,
    input_tokens: u64,
    cached_input_tokens: u64,
    output_tokens: u64,
    total_tokens: u64,
    sessions: usize,
}

#[derive(Default, Serialize)]
#[serde(rename_all = "camelCase")]
struct AiProjectUsage {
    project: String,
    total_tokens: u64,
    sessions: usize,
    last_active_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AiRecentSession {
    id: String,
    project: String,
    model: String,
    started_at: String,
    last_active_at: String,
    input_tokens: u64,
    cached_input_tokens: u64,
    output_tokens: u64,
    total_tokens: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AiUsageSource {
    codex_connected: bool,
    account_source: Option<String>,
    codex_auth_found: bool,
    codex_cli_found: bool,
    sessions_found: bool,
    history_is_local: bool,
}

#[derive(Default)]
struct SessionUsage {
    id: String,
    project: String,
    model: String,
    started_at: String,
    last_active_at: String,
    input_tokens: u64,
    cached_input_tokens: u64,
    output_tokens: u64,
}

impl SessionUsage {
    fn total_tokens(&self) -> u64 {
        self.input_tokens.saturating_add(self.output_tokens)
    }
}

struct CodexLiveUsage {
    plan: Option<String>,
    limits: Vec<AiRateLimit>,
    credits: Option<AiCredits>,
}

pub fn collect_dashboard() -> AiUsageDashboard {
    let collected_at = unix_timestamp_millis();
    let codex_home = codex_home();
    let sessions_path = codex_home.join("sessions");
    let auth_path = codex_home.join("auth.json");
    let cli_path = resolve_codex_cli();
    let auth_usage = collect_live_usage_from_auth(&auth_path);
    let (live_usage, account_source, live_warning) = match auth_usage {
        Ok(usage) => (Some(usage), Some("codex-auth".to_string()), None),
        Err(auth_error) => match cli_path.as_deref() {
            Some(path) => match collect_live_usage_from_cli(path) {
                Ok(usage) => (Some(usage), Some("codex-cli".to_string()), None),
                Err(cli_error) => (None, None, Some(format!("{auth_error} {cli_error}"))),
            },
            None => (None, None, Some(auth_error)),
        },
    };

    let (sessions, history_warning) = match collect_session_history(&sessions_path) {
        Ok(sessions) => (sessions, None),
        Err(error) => (Vec::new(), Some(error)),
    };
    let (summary, daily, models, projects, recent_sessions) = summarize_sessions(sessions);
    let warning = match (live_warning, history_warning) {
        (Some(live), Some(history)) => Some(format!("{live} {history}")),
        (Some(warning), None) | (None, Some(warning)) => Some(warning),
        (None, None) => None,
    };
    let codex_connected = live_usage
        .as_ref()
        .is_some_and(|usage| !usage.limits.is_empty() || usage.plan.is_some());
    let (plan, limits, credits) = live_usage
        .map(|usage| (usage.plan, usage.limits, usage.credits))
        .unwrap_or_else(|| (None, Vec::new(), None));

    AiUsageDashboard {
        collected_at,
        plan,
        limits,
        credits,
        summary,
        daily,
        models,
        projects,
        recent_sessions,
        source: AiUsageSource {
            codex_connected,
            account_source,
            codex_auth_found: auth_path.is_file(),
            codex_cli_found: cli_path.is_some(),
            sessions_found: sessions_path.is_dir(),
            history_is_local: true,
        },
        warning,
    }
}

fn codex_home() -> PathBuf {
    env::var_os("CODEX_HOME")
        .map(PathBuf::from)
        .or_else(|| env::var_os("HOME").map(|home| PathBuf::from(home).join(".codex")))
        .unwrap_or_else(|| PathBuf::from(".codex"))
}

fn resolve_codex_cli() -> Option<PathBuf> {
    if let Some(path) = env::var_os("CODEX_CLI_PATH").map(PathBuf::from) {
        if is_executable_file(&path) {
            return Some(path);
        }
    }

    let home = env::var_os("HOME").map(PathBuf::from);
    let mut candidates = vec![
        PathBuf::from("/Applications/Codex.app/Contents/Resources/codex"),
        PathBuf::from("/opt/homebrew/bin/codex"),
        PathBuf::from("/usr/local/bin/codex"),
    ];
    if let Some(home) = home.as_ref() {
        candidates.push(home.join(".local/bin/codex"));
        candidates.push(home.join(".npm-global/bin/codex"));
    }
    if let Some(path) = candidates.into_iter().find(|path| is_executable_file(path)) {
        return Some(path);
    }

    let output = Command::new("/bin/zsh")
        .args(["-lc", "command -v codex"])
        .output()
        .ok();
    if let Some(output) = output.filter(|output| output.status.success()) {
        if let Some(path) = String::from_utf8_lossy(&output.stdout)
            .lines()
            .rev()
            .map(str::trim)
            .filter(|line| !line.is_empty())
            .map(PathBuf::from)
            .find(|path| is_executable_file(path))
        {
            return Some(path);
        }
    }

    let home = home?;
    let nvm_versions = home.join(".nvm/versions/node");
    let mut nvm_candidates = fs::read_dir(nvm_versions)
        .ok()?
        .flatten()
        .map(|entry| entry.path().join("bin/codex"))
        .filter(|path| is_executable_file(path))
        .collect::<Vec<_>>();
    nvm_candidates.sort();
    nvm_candidates.reverse();
    nvm_candidates.into_iter().next()
}

fn is_executable_file(path: &Path) -> bool {
    path.is_file()
}

fn collect_live_usage_from_auth(auth_path: &Path) -> Result<CodexLiveUsage, String> {
    let auth = fs::read_to_string(auth_path).map_err(|_| {
        "No reusable Codex sign-in was found. Open Codex and sign in, then refresh.".to_string()
    })?;
    let auth = serde_json::from_str::<Value>(&auth)
        .map_err(|_| "The saved Codex sign-in could not be read.".to_string())?;
    let tokens = auth
        .get("tokens")
        .ok_or_else(|| "The saved Codex sign-in has no ChatGPT account token.".to_string())?;
    let access_token = string_field(tokens, &["access_token", "accessToken"]).ok_or_else(|| {
        "The saved Codex sign-in has expired. Open Codex once, then refresh.".to_string()
    })?;
    let account_id = string_field(tokens, &["account_id", "accountId"]);

    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(7))
        .user_agent(format!("Lifever/{}", env!("CARGO_PKG_VERSION")))
        .build()
        .map_err(|_| "Couldn’t prepare the OpenAI account connection.".to_string())?;
    let mut request = client
        .get(CHATGPT_USAGE_URL)
        .bearer_auth(access_token)
        .header(reqwest::header::ACCEPT, "application/json");
    if let Some(account_id) = account_id {
        request = request.header("ChatGPT-Account-Id", account_id);
    }
    let response = request.send().map_err(|_| {
        "Couldn’t reach OpenAI for live usage. Local history is still available.".to_string()
    })?;
    let status = response.status();
    if status == reqwest::StatusCode::UNAUTHORIZED || status == reqwest::StatusCode::FORBIDDEN {
        return Err(
            "The Codex sign-in needs refreshing. Open Codex once, then refresh.".to_string(),
        );
    }
    if !status.is_success() {
        return Err(format!(
            "OpenAI live usage is temporarily unavailable ({}).",
            status.as_u16()
        ));
    }
    let payload = response
        .json::<Value>()
        .map_err(|_| "OpenAI returned an unreadable usage response.".to_string())?;
    parse_authenticated_usage(payload)
}

fn collect_live_usage_from_cli(codex_path: &Path) -> Result<CodexLiveUsage, String> {
    let mut command = Command::new(codex_path);
    command.args(["-s", "read-only", "-a", "untrusted", "app-server"]);
    if let Some(parent) = codex_path.parent() {
        let inherited_path = env::var("PATH").unwrap_or_default();
        command.env(
            "PATH",
            format!("{}:{inherited_path}", parent.to_string_lossy()),
        );
    }
    let mut child = command
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|error| format!("Couldn’t start Codex: {error}"))?;
    let mut stdin = child
        .stdin
        .take()
        .ok_or_else(|| "Codex did not open an input stream.".to_string())?;
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "Codex did not open an output stream.".to_string())?;
    let (sender, receiver) = mpsc::channel();

    thread::spawn(move || {
        for line in BufReader::new(stdout).lines() {
            let Ok(line) = line else { break };
            if sender.send(line).is_err() {
                break;
            }
        }
    });

    let result = (|| {
        send_rpc(
            &mut stdin,
            1,
            "initialize",
            json!({ "clientInfo": { "name": "lifever", "version": env!("CARGO_PKG_VERSION") } }),
        )?;
        let _ = receive_rpc(&receiver, 1, Duration::from_secs(8))?;
        send_notification(&mut stdin, "initialized", json!({}))?;
        send_rpc(&mut stdin, 2, "account/rateLimits/read", json!({}))?;
        let response = receive_rpc(&receiver, 2, Duration::from_secs(5))?;
        parse_live_usage(response)
    })();

    stop_child(&mut child);
    result
}

fn send_rpc(stdin: &mut ChildStdin, id: u64, method: &str, params: Value) -> Result<(), String> {
    write_rpc(
        stdin,
        json!({ "id": id, "method": method, "params": params }),
    )
}

fn send_notification(stdin: &mut ChildStdin, method: &str, params: Value) -> Result<(), String> {
    write_rpc(stdin, json!({ "method": method, "params": params }))
}

fn write_rpc(stdin: &mut ChildStdin, message: Value) -> Result<(), String> {
    serde_json::to_writer(&mut *stdin, &message)
        .map_err(|error| format!("Couldn’t encode the Codex request: {error}"))?;
    stdin
        .write_all(b"\n")
        .and_then(|_| stdin.flush())
        .map_err(|error| format!("Couldn’t send the Codex request: {error}"))
}

fn receive_rpc(receiver: &Receiver<String>, id: u64, timeout: Duration) -> Result<Value, String> {
    let started = SystemTime::now();
    loop {
        let elapsed = started.elapsed().unwrap_or_default();
        let remaining = timeout
            .checked_sub(elapsed)
            .ok_or_else(|| "Codex took too long to respond.".to_string())?;
        let line = receiver
            .recv_timeout(remaining)
            .map_err(|_| "Codex took too long to respond.".to_string())?;
        let Ok(message) = serde_json::from_str::<Value>(&line) else {
            continue;
        };
        if message.get("id").and_then(Value::as_u64) != Some(id) {
            continue;
        }
        if let Some(error) = message
            .get("error")
            .and_then(|error| error.get("message"))
            .and_then(Value::as_str)
        {
            return Err(format!("Codex usage is unavailable: {error}"));
        }
        return message
            .get("result")
            .cloned()
            .ok_or_else(|| "Codex returned an incomplete response.".to_string());
    }
}

fn stop_child(child: &mut Child) {
    let _ = child.kill();
    let _ = child.wait();
}

fn parse_live_usage(result: Value) -> Result<CodexLiveUsage, String> {
    let rate_limits = result
        .get("rateLimits")
        .or_else(|| result.get("rate_limits"))
        .ok_or_else(|| "Codex did not return account limits.".to_string())?;
    let plan = string_field(rate_limits, &["planType", "plan_type"]);
    let credits = rate_limits.get("credits").map(|credits| AiCredits {
        has_credits: bool_field(credits, &["hasCredits", "has_credits"]).unwrap_or(false),
        unlimited: bool_field(credits, &["unlimited"]).unwrap_or(false),
        balance: string_field(credits, &["balance"]),
    });
    let mut limits = Vec::new();
    append_limit_windows(&mut limits, "codex", None, rate_limits);

    if let Some(additional) = result
        .get("rateLimitsByLimitId")
        .or_else(|| result.get("rate_limits_by_limit_id"))
        .and_then(Value::as_object)
    {
        for (id, value) in additional {
            if id == "codex" {
                continue;
            }
            let name = string_field(value, &["limitName", "limit_name"])
                .unwrap_or_else(|| humanize_identifier(id));
            append_limit_windows(&mut limits, id, Some(&name), value);
        }
    }

    Ok(CodexLiveUsage {
        plan,
        limits,
        credits,
    })
}

fn parse_authenticated_usage(result: Value) -> Result<CodexLiveUsage, String> {
    let rate_limits = result
        .get("rate_limit")
        .or_else(|| result.get("rateLimit"))
        .ok_or_else(|| "OpenAI did not return account limits.".to_string())?;
    let plan = string_field(&result, &["plan_type", "planType"]);
    let credits = result.get("credits").map(|credits| AiCredits {
        has_credits: bool_field(credits, &["has_credits", "hasCredits"]).unwrap_or(false),
        unlimited: bool_field(credits, &["unlimited"]).unwrap_or(false),
        balance: string_or_number_field(credits, &["balance"]),
    });
    let mut limits = Vec::new();
    append_limit_windows(&mut limits, "codex", None, rate_limits);

    if let Some(additional) = result
        .get("additional_rate_limits")
        .or_else(|| result.get("additionalRateLimits"))
        .and_then(Value::as_array)
    {
        for (index, value) in additional.iter().enumerate() {
            let Some(snapshot) = value.get("rate_limit").or_else(|| value.get("rateLimit")) else {
                continue;
            };
            let name = string_field(value, &["limit_name", "limitName"])
                .or_else(|| string_field(value, &["metered_feature", "meteredFeature"]))
                .unwrap_or_else(|| format!("Additional limit {}", index + 1));
            let id = string_field(value, &["metered_feature", "meteredFeature"])
                .unwrap_or_else(|| format!("additional-{index}"));
            append_limit_windows(&mut limits, &id, Some(&name), snapshot);
        }
    }

    Ok(CodexLiveUsage {
        plan,
        limits,
        credits,
    })
}

fn append_limit_windows(
    output: &mut Vec<AiRateLimit>,
    id: &str,
    name: Option<&str>,
    snapshot: &Value,
) {
    for (kind, keys) in [
        ("primary", ["primary", "primaryWindow", "primary_window"]),
        (
            "secondary",
            ["secondary", "secondaryWindow", "secondary_window"],
        ),
    ] {
        let Some(window) = keys.iter().find_map(|key| snapshot.get(*key)) else {
            continue;
        };
        let Some(used_percent) = number_field(window, &["usedPercent", "used_percent"]) else {
            continue;
        };
        let window_minutes = integer_field(window, &["windowDurationMins", "window_duration_mins"])
            .or_else(|| {
                integer_field(window, &["limitWindowSeconds", "limit_window_seconds"])
                    .map(|seconds| seconds / 60)
            });
        let resets_at = integer_field(window, &["resetsAt", "resets_at", "resetAt", "reset_at"]);
        let window_label = limit_window_label(window_minutes, kind);
        let label = name
            .map(|name| format!("{name} · {window_label}"))
            .unwrap_or(window_label);
        output.push(AiRateLimit {
            id: format!("{id}-{kind}"),
            label,
            used_percent: used_percent.clamp(0.0, 100.0),
            remaining_percent: (100.0 - used_percent).clamp(0.0, 100.0),
            window_minutes,
            resets_at,
        });
    }
}

fn limit_window_label(minutes: Option<u64>, fallback: &str) -> String {
    match minutes {
        Some(value) if value >= 6 * 24 * 60 => "Weekly limit".to_string(),
        Some(value) if value >= 24 * 60 => format!("{}-day limit", value / (24 * 60)),
        Some(value) if value >= 60 => format!("{}-hour limit", value / 60),
        Some(value) => format!("{value}-minute limit"),
        None if fallback == "primary" => "Primary limit".to_string(),
        None => "Secondary limit".to_string(),
    }
}

fn humanize_identifier(value: &str) -> String {
    value
        .split(['_', '-'])
        .filter(|part| !part.is_empty())
        .map(|part| {
            let mut characters = part.chars();
            characters
                .next()
                .map(|first| first.to_uppercase().collect::<String>() + characters.as_str())
                .unwrap_or_default()
        })
        .collect::<Vec<_>>()
        .join(" ")
}

fn string_field(value: &Value, keys: &[&str]) -> Option<String> {
    keys.iter()
        .find_map(|key| value.get(*key))
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
}

fn string_or_number_field(value: &Value, keys: &[&str]) -> Option<String> {
    keys.iter().find_map(|key| {
        value.get(*key).and_then(|field| {
            field
                .as_str()
                .map(str::to_string)
                .or_else(|| field.as_f64().map(|number| number.to_string()))
        })
    })
}

fn bool_field(value: &Value, keys: &[&str]) -> Option<bool> {
    keys.iter()
        .find_map(|key| value.get(*key))
        .and_then(Value::as_bool)
}

fn number_field(value: &Value, keys: &[&str]) -> Option<f64> {
    keys.iter().find_map(|key| {
        value.get(*key).and_then(|field| {
            field
                .as_f64()
                .or_else(|| field.as_str().and_then(|field| field.parse().ok()))
        })
    })
}

fn integer_field(value: &Value, keys: &[&str]) -> Option<u64> {
    keys.iter().find_map(|key| {
        value.get(*key).and_then(|field| {
            field
                .as_u64()
                .or_else(|| field.as_f64().map(|field| field.max(0.0) as u64))
                .or_else(|| field.as_str().and_then(|field| field.parse().ok()))
        })
    })
}

fn collect_session_history(sessions_path: &Path) -> Result<Vec<SessionUsage>, String> {
    if !sessions_path.is_dir() {
        return Err("No local Codex session history was found.".to_string());
    }
    let cutoff = SystemTime::now()
        .checked_sub(Duration::from_secs(
            HISTORY_DAYS.saturating_sub(1) * 24 * 60 * 60,
        ))
        .unwrap_or(UNIX_EPOCH);
    let mut files = Vec::new();
    collect_recent_jsonl_files(sessions_path, cutoff, &mut files);
    files.sort_by(|left, right| right.1.cmp(&left.1));

    Ok(files
        .into_iter()
        .filter_map(|(path, _)| parse_session_file(&path))
        .filter(|session| session.total_tokens() > 0)
        .collect())
}

fn collect_recent_jsonl_files(
    directory: &Path,
    cutoff: SystemTime,
    output: &mut Vec<(PathBuf, SystemTime)>,
) {
    let Ok(entries) = fs::read_dir(directory) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            collect_recent_jsonl_files(&path, cutoff, output);
            continue;
        }
        if path.extension().and_then(|extension| extension.to_str()) != Some("jsonl") {
            continue;
        }
        let Ok(modified) = entry.metadata().and_then(|metadata| metadata.modified()) else {
            continue;
        };
        if modified >= cutoff {
            output.push((path, modified));
        }
    }
}

fn parse_session_file(path: &Path) -> Option<SessionUsage> {
    let mut file = File::open(path).ok()?;
    let length = file.metadata().ok()?.len();
    let mut session = SessionUsage::default();

    let first_length = length.min(FIRST_READ_BYTES) as usize;
    let mut first = vec![0; first_length];
    file.read_exact(&mut first).ok()?;
    parse_session_region(&first, &mut session);

    if length > FIRST_READ_BYTES {
        let tail_start = length.saturating_sub(TAIL_READ_BYTES);
        file.seek(SeekFrom::Start(tail_start)).ok()?;
        let mut tail = Vec::with_capacity((length - tail_start) as usize);
        file.read_to_end(&mut tail).ok()?;
        if tail_start > 0 {
            if let Some(first_newline) = tail.iter().position(|byte| *byte == b'\n') {
                parse_session_region(&tail[first_newline + 1..], &mut session);
            }
        } else {
            parse_session_region(&tail, &mut session);
        }
    }

    if session.id.is_empty() {
        session.id = path
            .file_stem()
            .and_then(|name| name.to_str())
            .unwrap_or("codex-session")
            .rsplit('-')
            .take(5)
            .collect::<Vec<_>>()
            .into_iter()
            .rev()
            .collect::<Vec<_>>()
            .join("-");
    }
    if session.project.is_empty() {
        session.project = "Codex".to_string();
    }
    if session.model.is_empty() {
        session.model = UNKNOWN_MODEL.to_string();
    }
    if session.started_at.is_empty() {
        session.started_at = path_date(path).unwrap_or_default();
    }
    if session.last_active_at.is_empty() {
        session.last_active_at = session.started_at.clone();
    }
    Some(session)
}

fn parse_session_region(bytes: &[u8], session: &mut SessionUsage) {
    for line in bytes.split(|byte| *byte == b'\n') {
        if line.is_empty()
            || (!contains_bytes(line, b"session_meta")
                && !contains_bytes(line, b"turn_context")
                && !contains_bytes(line, b"token_count"))
        {
            continue;
        }
        let Ok(value) = serde_json::from_slice::<Value>(line) else {
            continue;
        };
        let record_type = value.get("type").and_then(Value::as_str);
        let payload = value.get("payload").unwrap_or(&Value::Null);
        match record_type {
            Some("session_meta") => {
                if session.id.is_empty() {
                    session.id = string_field(payload, &["id", "session_id", "sessionId"])
                        .unwrap_or_default();
                }
                if session.project.is_empty() {
                    session.project = string_field(payload, &["cwd"])
                        .and_then(|cwd| {
                            Path::new(&cwd)
                                .file_name()
                                .and_then(|name| name.to_str())
                                .map(str::to_string)
                        })
                        .unwrap_or_default();
                }
                if session.started_at.is_empty() {
                    session.started_at = string_field(&value, &["timestamp"]).unwrap_or_default();
                }
            }
            Some("turn_context") => {
                if let Some(model) = string_field(payload, &["model", "model_name"]).or_else(|| {
                    payload
                        .get("info")
                        .and_then(|info| string_field(info, &["model", "model_name"]))
                }) {
                    session.model = model;
                }
            }
            Some("event_msg")
                if payload.get("type").and_then(Value::as_str) == Some("token_count") =>
            {
                if let Some(timestamp) = string_field(&value, &["timestamp"]) {
                    session.last_active_at = timestamp;
                }
                let Some(info) = payload.get("info") else {
                    continue;
                };
                if let Some(model) = string_field(info, &["model", "model_name"]) {
                    session.model = model;
                }
                let Some(total) = info
                    .get("total_token_usage")
                    .or_else(|| info.get("totalTokenUsage"))
                else {
                    continue;
                };
                session.input_tokens =
                    integer_field(total, &["input_tokens", "inputTokens"]).unwrap_or(0);
                session.cached_input_tokens = integer_field(
                    total,
                    &[
                        "cached_input_tokens",
                        "cachedInputTokens",
                        "cache_read_input_tokens",
                    ],
                )
                .unwrap_or(0)
                .min(session.input_tokens);
                session.output_tokens =
                    integer_field(total, &["output_tokens", "outputTokens"]).unwrap_or(0);
            }
            _ => {}
        }
    }
}

fn contains_bytes(haystack: &[u8], needle: &[u8]) -> bool {
    haystack
        .windows(needle.len())
        .any(|window| window == needle)
}

fn path_date(path: &Path) -> Option<String> {
    let parts = path
        .components()
        .filter_map(|component| component.as_os_str().to_str())
        .collect::<Vec<_>>();
    let sessions_index = parts.iter().position(|part| *part == "sessions")?;
    let year = parts.get(sessions_index + 1)?;
    let month = parts.get(sessions_index + 2)?;
    let day = parts.get(sessions_index + 3)?;
    Some(format!("{year}-{month}-{day}T00:00:00Z"))
}

fn summarize_sessions(
    mut sessions: Vec<SessionUsage>,
) -> (
    AiTokenSummary,
    Vec<AiDailyUsage>,
    Vec<AiModelUsage>,
    Vec<AiProjectUsage>,
    Vec<AiRecentSession>,
) {
    sessions.sort_by(|left, right| right.last_active_at.cmp(&left.last_active_at));
    let mut summary = AiTokenSummary {
        history_days: HISTORY_DAYS,
        ..AiTokenSummary::default()
    };
    let mut daily = BTreeMap::<String, AiDailyUsage>::new();
    let mut models = HashMap::<String, AiModelUsage>::new();
    let mut projects = HashMap::<String, AiProjectUsage>::new();

    for session in &sessions {
        let total = session.total_tokens();
        summary.input_tokens = summary.input_tokens.saturating_add(session.input_tokens);
        summary.cached_input_tokens = summary
            .cached_input_tokens
            .saturating_add(session.cached_input_tokens);
        summary.output_tokens = summary.output_tokens.saturating_add(session.output_tokens);
        summary.total_tokens = summary.total_tokens.saturating_add(total);
        summary.session_count += 1;

        let date = session
            .last_active_at
            .get(0..10)
            .unwrap_or("Unknown")
            .to_string();
        let day = daily.entry(date.clone()).or_insert_with(|| AiDailyUsage {
            date,
            ..AiDailyUsage::default()
        });
        day.input_tokens = day.input_tokens.saturating_add(session.input_tokens);
        day.cached_input_tokens = day
            .cached_input_tokens
            .saturating_add(session.cached_input_tokens);
        day.output_tokens = day.output_tokens.saturating_add(session.output_tokens);
        day.total_tokens = day.total_tokens.saturating_add(total);
        day.sessions += 1;

        if session.model != UNKNOWN_MODEL {
            let model = models
                .entry(session.model.clone())
                .or_insert_with(|| AiModelUsage {
                    model: session.model.clone(),
                    ..AiModelUsage::default()
                });
            model.input_tokens = model.input_tokens.saturating_add(session.input_tokens);
            model.cached_input_tokens = model
                .cached_input_tokens
                .saturating_add(session.cached_input_tokens);
            model.output_tokens = model.output_tokens.saturating_add(session.output_tokens);
            model.total_tokens = model.total_tokens.saturating_add(total);
            model.sessions += 1;
        }

        let project = projects
            .entry(session.project.clone())
            .or_insert_with(|| AiProjectUsage {
                project: session.project.clone(),
                last_active_at: session.last_active_at.clone(),
                ..AiProjectUsage::default()
            });
        project.total_tokens = project.total_tokens.saturating_add(total);
        project.sessions += 1;
        if session.last_active_at > project.last_active_at {
            project.last_active_at = session.last_active_at.clone();
        }
    }

    summary.active_days = daily.len();
    let mut model_list = models.into_values().collect::<Vec<_>>();
    model_list.sort_by(|left, right| right.total_tokens.cmp(&left.total_tokens));
    let mut project_list = projects.into_values().collect::<Vec<_>>();
    project_list.sort_by(|left, right| right.total_tokens.cmp(&left.total_tokens));
    let recent_sessions = sessions
        .into_iter()
        .take(MAX_RECENT_SESSIONS)
        .map(|session| {
            let total_tokens = session.total_tokens();
            AiRecentSession {
                id: session.id,
                project: session.project,
                model: session.model,
                started_at: session.started_at,
                last_active_at: session.last_active_at,
                input_tokens: session.input_tokens,
                cached_input_tokens: session.cached_input_tokens,
                output_tokens: session.output_tokens,
                total_tokens,
            }
        })
        .collect();

    (
        summary,
        daily.into_values().collect(),
        model_list,
        project_list,
        recent_sessions,
    )
}

fn unix_timestamp_millis() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_live_codex_limits_and_model_specific_windows() {
        let usage = parse_live_usage(json!({
            "rateLimits": {
                "planType": "prolite",
                "primary": {
                    "usedPercent": 29,
                    "windowDurationMins": 10_080,
                    "resetsAt": 1_785_611_950_u64
                }
            },
            "rateLimitsByLimitId": {
                "codex": {
                    "primary": {
                        "usedPercent": 29,
                        "windowDurationMins": 10_080
                    }
                },
                "codex_spark": {
                    "limitName": "Codex Spark",
                    "primary": {
                        "usedPercent": 4,
                        "windowDurationMins": 300
                    }
                }
            }
        }))
        .expect("fixture should parse");

        assert_eq!(usage.plan.as_deref(), Some("prolite"));
        assert_eq!(usage.limits.len(), 2);
        assert_eq!(usage.limits[0].label, "Weekly limit");
        assert_eq!(usage.limits[0].remaining_percent, 71.0);
        assert_eq!(usage.limits[1].label, "Codex Spark · 5-hour limit");
    }

    #[test]
    fn parses_authenticated_openai_limits() {
        let usage = parse_authenticated_usage(json!({
            "plan_type": "prolite",
            "rate_limit": {
                "primary_window": {
                    "used_percent": 30,
                    "limit_window_seconds": 604_800,
                    "reset_at": 1_785_611_950_u64
                }
            },
            "additional_rate_limits": [{
                "limit_name": "GPT-5.3-Codex-Spark",
                "metered_feature": "codex_bengalfox",
                "rate_limit": {
                    "primary_window": {
                        "used_percent": 4,
                        "limit_window_seconds": 18_000
                    }
                }
            }],
            "credits": {
                "has_credits": false,
                "unlimited": false,
                "balance": "0"
            }
        }))
        .expect("authenticated fixture should parse");

        assert_eq!(usage.plan.as_deref(), Some("prolite"));
        assert_eq!(usage.limits.len(), 2);
        assert_eq!(usage.limits[0].label, "Weekly limit");
        assert_eq!(usage.limits[0].remaining_percent, 70.0);
        assert_eq!(usage.limits[1].label, "GPT-5.3-Codex-Spark · 5-hour limit");
    }

    #[test]
    fn session_parser_keeps_only_aggregate_metadata() {
        let fixture = concat!(
            "{\"type\":\"session_meta\",\"timestamp\":\"2026-07-26T10:00:00Z\",",
            "\"payload\":{\"id\":\"session-1\",\"cwd\":\"/Users/person/dev/lifever\"}}\n",
            "{\"type\":\"turn_context\",\"timestamp\":\"2026-07-26T10:00:01Z\",",
            "\"payload\":{\"model\":\"gpt-5.6-sol\"}}\n",
            "{\"type\":\"event_msg\",\"timestamp\":\"2026-07-26T10:05:00Z\",",
            "\"payload\":{\"type\":\"token_count\",\"info\":{\"total_token_usage\":",
            "{\"input_tokens\":1200,\"cached_input_tokens\":800,\"output_tokens\":150}}}}\n"
        );
        let mut session = SessionUsage::default();
        parse_session_region(fixture.as_bytes(), &mut session);

        assert_eq!(session.id, "session-1");
        assert_eq!(session.project, "lifever");
        assert_eq!(session.model, "gpt-5.6-sol");
        assert_eq!(session.input_tokens, 1_200);
        assert_eq!(session.cached_input_tokens, 800);
        assert_eq!(session.output_tokens, 150);
        assert_eq!(session.total_tokens(), 1_350);
        assert_eq!(session.last_active_at, "2026-07-26T10:05:00Z");
        assert!(!session.project.contains("/Users/"));
    }

    #[test]
    fn unknown_sessions_do_not_become_a_fake_codex_model() {
        let (_, _, models, _, _) = summarize_sessions(vec![
            SessionUsage {
                id: "unknown".to_string(),
                project: "lifever".to_string(),
                model: UNKNOWN_MODEL.to_string(),
                started_at: "2026-07-26T10:00:00Z".to_string(),
                last_active_at: "2026-07-26T10:05:00Z".to_string(),
                input_tokens: 10_000,
                output_tokens: 1_000,
                ..SessionUsage::default()
            },
            SessionUsage {
                id: "known".to_string(),
                project: "lifever".to_string(),
                model: "gpt-5.6-sol".to_string(),
                started_at: "2026-07-26T11:00:00Z".to_string(),
                last_active_at: "2026-07-26T11:05:00Z".to_string(),
                input_tokens: 5_000,
                output_tokens: 500,
                ..SessionUsage::default()
            },
        ]);

        assert_eq!(models.len(), 1);
        assert_eq!(models[0].model, "gpt-5.6-sol");
    }
}
