"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const windowsDownloadUrl =
  "https://github.com/badosz0/lifever/releases/latest/download/Lifever-Windows-x64-setup.exe";
const installCommand = `brew tap badosz0/lifever https://github.com/badosz0/lifever
brew install --cask lifever`;

export function InstallCommand() {
  const [copied, setCopied] = useState(false);
  const [platform, setPlatform] = useState<"macos" | "windows">("macos");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    [],
  );

  async function copyCommand() {
    await navigator.clipboard.writeText(installCommand);
    setCopied(true);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="install-command">
      <div className="terminal-bar">
        <div className="platform-tabs" role="tablist" aria-label="Desktop platform">
          <button
            type="button"
            role="tab"
            aria-selected={platform === "macos"}
            data-active={platform === "macos"}
            onClick={() => setPlatform("macos")}
          >
            macOS
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={platform === "windows"}
            data-active={platform === "windows"}
            onClick={() => setPlatform("windows")}
          >
            Windows
          </button>
        </div>
        {platform === "macos" ? (
          <>
            <span className="terminal-note">Apple notarized</span>
            <button
              type="button"
              className="copy-button"
              onClick={copyCommand}
              aria-label="Copy Homebrew installation commands"
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
            </button>
          </>
        ) : null}
      </div>
      {platform === "macos" ? (
        <pre role="tabpanel">
          <code>
            <span className="prompt">$</span> brew tap badosz0/lifever{" "}
            <span className="command-muted">https://github.com/badosz0/lifever</span>
            {"\n"}
            <span className="prompt">$</span> brew install --cask lifever
          </code>
        </pre>
      ) : (
        <div className="windows-install" role="tabpanel">
          <p>
            <strong>Windows 10 or 11</strong>
            <span>x64 · Per-user setup</span>
          </p>
          <a className="button" href={windowsDownloadUrl}>
            Download .exe
          </a>
        </div>
      )}
    </div>
  );
}
