cask "lifever" do
  version "0.1.5"
  sha256 "bcd2e0b745e5e91c25a032290b0ee1adcf96edec50fb0f2935e372357096d419"

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
