"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const installCommand = `brew tap badosz0/lifever https://github.com/badosz0/lifever
brew trust --cask badosz0/lifever/lifever
brew install lifever`;

export function InstallCommand() {
  const [copied, setCopied] = useState(false);
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
        <span className="terminal-label">Homebrew</span>
        <span className="terminal-note">Copy all three commands</span>
        <button
          type="button"
          className="copy-button"
          onClick={copyCommand}
          aria-label="Copy Homebrew installation commands"
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
          <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre>
        <code>
          <span className="prompt">$</span> brew tap badosz0/lifever{" "}
          <span className="command-muted">https://github.com/badosz0/lifever</span>
          {"\n"}
          <span className="prompt">$</span> brew trust --cask
          badosz0/lifever/lifever{"\n"}
          <span className="prompt">$</span> brew install lifever
        </code>
      </pre>
    </div>
  );
}
