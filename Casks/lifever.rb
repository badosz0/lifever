cask "lifever" do
  version "0.1.3"
  sha256 "64c9a3f52c7f19f9057855788ecf58973923b5429d8c73d9c6849222e0fdb26b"

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
