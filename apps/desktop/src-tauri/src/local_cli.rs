use std::{env, path::PathBuf, process::Command};

pub fn home_directory() -> Option<PathBuf> {
    env::var_os("HOME")
        .or_else(|| env::var_os("USERPROFILE"))
        .map(PathBuf::from)
}

pub fn is_executable_file(path: &std::path::Path) -> bool {
    path.is_file()
}

pub fn find_on_path(binary: &str) -> Option<PathBuf> {
    let output = platform_path_lookup(binary).ok()?;
    if !output.status.success() {
        return None;
    }

    String::from_utf8_lossy(&output.stdout)
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .map(PathBuf::from)
        .find(|path| is_executable_file(path))
}

#[cfg(target_os = "windows")]
fn platform_path_lookup(binary: &str) -> std::io::Result<std::process::Output> {
    Command::new("where.exe").arg(binary).output()
}

#[cfg(not(target_os = "windows"))]
fn platform_path_lookup(binary: &str) -> std::io::Result<std::process::Output> {
    Command::new("/bin/sh")
        .args(["-lc", &format!("command -v {binary}")])
        .output()
}
