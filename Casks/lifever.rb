cask "lifever" do
  version "0.1.19"
  sha256 "1c44a77005cce86f796a962feb464c904a437176f7b8854b9d6e8e7bea9c3fc7"

  url "https://github.com/badosz0/lifever/releases/download/v#{version}/Lifever-#{version}-macOS-universal.dmg",
      verified: "github.com/badosz0/lifever/"
  name "Lifever"
  desc "Calm, modular home for the everyday parts of life"
  homepage "https://www.lifever.app/"

  livecheck do
    url :url
    strategy :github_latest
  end

  depends_on macos: :monterey

  app "Lifever.app"

  zap trash: [
    "~/Library/Application Support/app.lifever.desktop",
    "~/Library/Caches/app.lifever.desktop",
    "~/Library/Preferences/app.lifever.desktop.plist",
    "~/Library/Saved Application State/app.lifever.desktop.savedState",
    "~/Library/WebKit/app.lifever.desktop",
  ]
end
