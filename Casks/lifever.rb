cask "lifever" do
  version "0.1.14"
  sha256 "bec0bbfdd751792930992006813d0d3a3e9633be3cc72a38a8ba70f27184d967"

  url "https://github.com/badosz0/lifever/releases/download/v#{version}/Lifever-#{version}-macOS-universal.dmg",
      verified: "github.com/badosz0/lifever/"
  name "Lifever"
  desc "Calm, modular home for the everyday parts of life"
  homepage "https://github.com/badosz0/lifever"

  livecheck do
    url :url
    strategy :github_latest
  end

  depends_on macos: :monterey

  app "Lifever.app"

  postflight do
    system_command "/usr/bin/xattr",
                   args: ["-dr", "com.apple.quarantine", "#{appdir}/Lifever.app"]
  end

  zap trash: [
    "~/Library/Application Support/app.lifever.desktop",
    "~/Library/Caches/app.lifever.desktop",
    "~/Library/Preferences/app.lifever.desktop.plist",
    "~/Library/Saved Application State/app.lifever.desktop.savedState",
    "~/Library/WebKit/app.lifever.desktop",
  ]
end
