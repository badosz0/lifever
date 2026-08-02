export const sourceRepository = "badosz0/lifever";
export const releaseRepository = sourceRepository;
export const homebrewTapName = "badosz0/lifever";
export const homebrewTapUrl = `https://github.com/${sourceRepository}`;

export const releaseAssetName = (version) =>
  `Lifever-${version}-macOS-universal.dmg`;

export const windowsReleaseAssetName = "Lifever-Windows-x64-setup.exe";

export const renderHomebrewCask = ({ sha256, version }) => `cask "lifever" do
  version "${version}"
  sha256 "${sha256}"

  url "https://github.com/${releaseRepository}/releases/download/v#{version}/Lifever-#{version}-macOS-universal.dmg",
      verified: "github.com/${releaseRepository}/"
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
`;
