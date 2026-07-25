export const sourceRepository = "badosz0/lifever";
export const releaseRepository = sourceRepository;
export const homebrewTapName = "badosz0/lifever";
export const homebrewTapUrl = `https://github.com/${sourceRepository}`;

export const releaseAssetName = (version) =>
  `Lifever-${version}-macOS-universal.dmg`;

export const renderHomebrewCask = ({ sha256, version }) => `cask "lifever" do
  version "${version}"
  sha256 "${sha256}"

  url "https://github.com/${releaseRepository}/releases/download/v#{version}/Lifever-#{version}-macOS-universal.dmg",
      verified: "github.com/${releaseRepository}/"
  name "Lifever"
  desc "Calm, modular home for the everyday parts of life"
  homepage "https://github.com/${releaseRepository}"

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
`;
