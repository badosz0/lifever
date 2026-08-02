use crate::local_cli::{find_on_path, home_directory, is_executable_file};
use serde::{Deserialize, Serialize};
use std::{env, path::PathBuf, process::Command};

#[derive(Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RtkUsageDashboard {
    installed: bool,
    version: Option<String>,
    summary: Option<RtkGainSummary>,
    daily: Vec<RtkDailyUsage>,
    weekly: Vec<RtkWeeklyUsage>,
    monthly: Vec<RtkMonthlyUsage>,
    warning: Option<String>,
}

#[derive(Default, Deserialize, Serialize)]
#[serde(
    default,
    rename_all(serialize = "camelCase", deserialize = "snake_case")
)]
pub struct RtkGainSummary {
    total_commands: u64,
    total_input: u64,
    total_output: u64,
    total_saved: u64,
    avg_savings_pct: f64,
    total_time_ms: u64,
    avg_time_ms: u64,
}

#[derive(Default, Deserialize, Serialize)]
#[serde(
    default,
    rename_all(serialize = "camelCase", deserialize = "snake_case")
)]
pub struct RtkDailyUsage {
    date: String,
    commands: u64,
    input_tokens: u64,
    output_tokens: u64,
    saved_tokens: u64,
    savings_pct: f64,
    total_time_ms: u64,
    avg_time_ms: u64,
}

#[derive(Default, Deserialize, Serialize)]
#[serde(
    default,
    rename_all(serialize = "camelCase", deserialize = "snake_case")
)]
pub struct RtkWeeklyUsage {
    week_start: String,
    week_end: String,
    commands: u64,
    input_tokens: u64,
    output_tokens: u64,
    saved_tokens: u64,
    savings_pct: f64,
    total_time_ms: u64,
    avg_time_ms: u64,
}

#[derive(Default, Deserialize, Serialize)]
#[serde(
    default,
    rename_all(serialize = "camelCase", deserialize = "snake_case")
)]
pub struct RtkMonthlyUsage {
    month: String,
    commands: u64,
    input_tokens: u64,
    output_tokens: u64,
    saved_tokens: u64,
    savings_pct: f64,
    total_time_ms: u64,
    avg_time_ms: u64,
}

#[derive(Deserialize)]
struct RtkGainExport {
    summary: RtkGainSummary,
    #[serde(default)]
    daily: Vec<RtkDailyUsage>,
    #[serde(default)]
    weekly: Vec<RtkWeeklyUsage>,
    #[serde(default)]
    monthly: Vec<RtkMonthlyUsage>,
}

pub fn collect_dashboard() -> RtkUsageDashboard {
    let Some(path) = resolve_rtk_cli() else {
        return RtkUsageDashboard::default();
    };
    let version = collect_version(&path);
    let output = match Command::new(&path)
        .args(["gain", "--all", "--format", "json"])
        .output()
    {
        Ok(output) => output,
        Err(_) => {
            return RtkUsageDashboard {
                installed: true,
                version,
                warning: Some(
                    "RTK is installed, but its gain statistics could not be read.".into(),
                ),
                ..RtkUsageDashboard::default()
            };
        }
    };

    if !output.status.success() {
        return RtkUsageDashboard {
            installed: true,
            version,
            warning: Some("RTK gain returned an error. Run `rtk gain` once to check it.".into()),
            ..RtkUsageDashboard::default()
        };
    }

    match parse_gain_output(&output.stdout) {
        Ok(export) => RtkUsageDashboard {
            installed: true,
            version,
            summary: Some(export.summary),
            daily: export.daily,
            weekly: export.weekly,
            monthly: export.monthly,
            warning: None,
        },
        Err(warning) => RtkUsageDashboard {
            installed: true,
            version,
            warning: Some(warning),
            ..RtkUsageDashboard::default()
        },
    }
}

fn parse_gain_output(output: &[u8]) -> Result<RtkGainExport, String> {
    serde_json::from_slice(output)
        .map_err(|_| "RTK returned gain statistics in an unsupported format.".to_string())
}

fn collect_version(path: &std::path::Path) -> Option<String> {
    let output = Command::new(path).arg("--version").output().ok()?;
    if !output.status.success() {
        return None;
    }
    let version = String::from_utf8_lossy(&output.stdout);
    version
        .trim()
        .strip_prefix("rtk ")
        .or_else(|| version.trim().strip_prefix("RTK "))
        .map(str::to_string)
        .or_else(|| Some(version.trim().to_string()).filter(|value| !value.is_empty()))
}

fn resolve_rtk_cli() -> Option<PathBuf> {
    if let Some(path) = env::var_os("RTK_CLI_PATH").map(PathBuf::from) {
        if is_executable_file(&path) {
            return Some(path);
        }
    }

    let home = home_directory();
    let mut candidates = vec![
        PathBuf::from("/opt/homebrew/bin/rtk"),
        PathBuf::from("/usr/local/bin/rtk"),
    ];
    if let Some(home) = home.as_ref() {
        candidates.push(home.join(".local/bin/rtk"));
        candidates.push(home.join(".cargo/bin/rtk"));
        candidates.push(home.join("bin/rtk"));
        candidates.push(home.join("scoop/shims/rtk.exe"));
        candidates.push(home.join("AppData/Local/Programs/rtk/rtk.exe"));
    }

    candidates
        .into_iter()
        .find(|path| is_executable_file(path))
        .or_else(|| find_on_path("rtk"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn parses_current_gain_export_and_serializes_for_the_web() {
        let fixture = json!({
            "summary": {
                "total_commands": 22353,
                "total_input": 26864003,
                "total_output": 13765624,
                "total_saved": 13101480,
                "avg_savings_pct": 48.77,
                "total_time_ms": 31198998,
                "avg_time_ms": 1395
            },
            "daily": [{
                "date": "2026-08-02",
                "commands": 60,
                "input_tokens": 11651,
                "output_tokens": 10187,
                "saved_tokens": 1464,
                "savings_pct": 12.56,
                "total_time_ms": 26615,
                "avg_time_ms": 443
            }],
            "weekly": [],
            "monthly": []
        });
        let export =
            parse_gain_output(fixture.to_string().as_bytes()).expect("fixture should parse");

        assert_eq!(export.summary.total_saved, 13_101_480);
        assert_eq!(export.daily[0].commands, 60);
        let serialized =
            serde_json::to_value(&export.daily[0]).expect("daily usage should serialize");
        assert_eq!(serialized["savedTokens"], 1_464);
        assert!(serialized.get("saved_tokens").is_none());
    }
}
