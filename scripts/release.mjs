import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createInterface } from "node:readline/promises";

import {
  ensureDesktopConfig,
  projectRoot,
} from "./lib/desktop-config.mjs";
import {
  homebrewTapName,
  homebrewTapUrl,
  releaseAssetName,
  releaseRepository,
  renderHomebrewCask,
  sourceRepository,
  windowsReleaseAssetName,
} from "./lib/release-config.mjs";

const desktopRoot = path.join(projectRoot, "apps/desktop/src-tauri");
const desktopIdentifier = "app.lifever.desktop";
const universalTarget = path.join(
  desktopRoot,
  "target/universal-apple-darwin/release",
);
const bundleDirectory = path.join(universalTarget, "bundle");
const dmgDirectory = path.join(bundleDirectory, "dmg");
const appPath = path.join(bundleDirectory, "macos/Lifever.app");
const appExecutable = path.join(appPath, "Contents/MacOS/lifever");
const releaseAssetsDirectory = path.join(
  desktopRoot,
  "target/release-assets",
);
const windowsReleaseWorkflow = "windows-release.yml";

function printHelp() {
  console.log(`Usage: pnpm release -- [options]

Build, validate, deploy, and publish the current Lifever version.

Options:
  --api-url <url>     Public API origin embedded in the desktop app
  --notes <path>      Markdown release notes to use instead of generated notes
  --allow-ad-hoc      Publish without Developer ID signing (not recommended)
  --skip-deploy       Skip D1 migrations and Worker deployment (recovery only)
  --skip-windows-wait Publish without waiting for the Windows installer
  --dry-run           Build and validate without publishing or deploying
  --yes               Skip the interactive production confirmation
  -h, --help          Show this help

Before releasing:
  pnpm release:version <version>
  git commit && git push
`);
}

function parseArguments(argv) {
  const args = argv.filter((argument) => argument !== "--");
  const options = {
    allowAdHoc: false,
    apiUrl: undefined,
    dryRun: false,
    notesPath: undefined,
    skipDeploy: false,
    skipWindowsWait: false,
    yes: false,
  };

  while (args.length > 0) {
    const argument = args.shift();
    if (argument === "--allow-ad-hoc") {
      options.allowAdHoc = true;
    } else if (argument === "--api-url") {
      options.apiUrl = args.shift();
      if (!options.apiUrl) throw new Error("--api-url requires a value.");
    } else if (argument === "--notes") {
      options.notesPath = args.shift();
      if (!options.notesPath) throw new Error("--notes requires a path.");
    } else if (argument === "--skip-deploy") {
      options.skipDeploy = true;
    } else if (argument === "--skip-windows-wait") {
      options.skipWindowsWait = true;
    } else if (argument === "--dry-run") {
      options.dryRun = true;
    } else if (argument === "--yes") {
      options.yes = true;
    } else if (argument === "--help" || argument === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown option: ${argument}`);
    }
  }

  return options;
}

function getSigningStatus() {
  const hasSigningIdentity = Boolean(
    process.env.APPLE_SIGNING_IDENTITY &&
      process.env.APPLE_SIGNING_IDENTITY !== "-",
  );
  const hasApiKeyCredentials = [
    "APPLE_API_ISSUER",
    "APPLE_API_KEY",
    "APPLE_API_KEY_PATH",
  ].every((name) => Boolean(process.env[name]));
  const hasAppleIdCredentials = [
    "APPLE_ID",
    "APPLE_PASSWORD",
    "APPLE_TEAM_ID",
  ].every((name) => Boolean(process.env[name]));

  return {
    trusted:
      hasSigningIdentity &&
      (hasApiKeyCredentials || hasAppleIdCredentials),
  };
}

function run(
  command,
  args,
  {
    allowFailure = false,
    capture = false,
    cwd = projectRoot,
    env = process.env,
  } = {},
) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    });
    let stdout = "";
    let stderr = "";

    if (capture) {
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk;
      });
    }

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0 || allowFailure) {
        resolve({
          code: code ?? 1,
          stderr: stderr.trim(),
          stdout: stdout.trim(),
        });
        return;
      }

      reject(
        new Error(
          signal
            ? `${command} stopped after receiving ${signal}`
            : `${command} exited with code ${code ?? "unknown"}${
                stderr.trim() ? `: ${stderr.trim()}` : ""
              }`,
        ),
      );
    });
  });
}

async function readJson(relativePath) {
  return JSON.parse(
    await readFile(path.join(projectRoot, relativePath), "utf8"),
  );
}

async function getVersion() {
  const [
    rootPackage,
    apiPackage,
    webPackage,
    desktopPackage,
    tauriConfig,
    cargoManifest,
  ] = await Promise.all([
    readJson("package.json"),
    readJson("apps/api/package.json"),
    readJson("apps/web/package.json"),
    readJson("apps/desktop/package.json"),
    readJson("apps/desktop/src-tauri/tauri.conf.json"),
    readFile(path.join(desktopRoot, "Cargo.toml"), "utf8"),
  ]);
  const cargoVersion = cargoManifest.match(
    /\[package\]\s+name = "lifever"\s+version = "([^"]+)"/,
  )?.[1];
  const versions = new Map([
    ["package.json", rootPackage.version],
    ["apps/api/package.json", apiPackage.version],
    ["apps/web/package.json", webPackage.version],
    ["apps/desktop/package.json", desktopPackage.version],
    ["tauri.conf.json", tauriConfig.version],
    ["Cargo.toml", cargoVersion],
  ]);
  const uniqueVersions = new Set(versions.values());

  if (uniqueVersions.size !== 1 || uniqueVersions.has(undefined)) {
    throw new Error(
      `Lifever versions do not match:\n${[...versions]
        .map(([file, version]) => `  ${file}: ${version ?? "missing"}`)
        .join("\n")}\nRun pnpm release:version <version> first.`,
    );
  }
  if (tauriConfig.identifier !== desktopIdentifier) {
    throw new Error(
      `The desktop identifier must remain ${desktopIdentifier} so macOS upgrades preserve the WebKit data store and signed-in sessions.`,
    );
  }

  return rootPackage.version;
}

async function assertRepositoryReady(version) {
  const status = await run("git", ["status", "--porcelain"], {
    capture: true,
  });
  if (status.stdout) {
    throw new Error(
      "The working tree is not clean. Commit or stash changes before releasing.",
    );
  }

  const branch = await run("git", ["branch", "--show-current"], {
    capture: true,
  });
  if (branch.stdout !== "main") {
    throw new Error(`Releases must run from main, not ${branch.stdout || "detached HEAD"}.`);
  }

  await run("git", ["fetch", "origin", "main", "--quiet"]);
  const [head, remoteHead] = await Promise.all([
    run("git", ["rev-parse", "HEAD"], { capture: true }),
    run("git", ["rev-parse", "origin/main"], { capture: true }),
  ]);
  if (head.stdout !== remoteHead.stdout) {
    throw new Error(
      "Local main and origin/main differ. Push or pull before releasing.",
    );
  }

  const remote = await run("git", ["remote", "get-url", "origin"], {
    capture: true,
  });
  if (!remote.stdout.includes(`${sourceRepository}.git`)) {
    throw new Error(`Expected origin to be ${sourceRepository}.`);
  }

  await run("gh", ["auth", "status"]);
  await run("gh", [
    "repo",
    "view",
    releaseRepository,
    "--json",
    "nameWithOwner",
  ]);

  const tag = `v${version}`;
  const existingTag = await run(
    "git",
    ["rev-list", "-n", "1", tag],
    { allowFailure: true, capture: true },
  );
  if (existingTag.code === 0 && existingTag.stdout !== head.stdout) {
    throw new Error(`${tag} already points to another commit.`);
  }

  return { head: head.stdout, tag, tagExists: existingTag.code === 0 };
}

async function confirmRelease({
  allowAdHoc,
  apiUrl,
  dryRun,
  signingStatus,
  skipDeploy,
  version,
  yes,
}) {
  console.log(`\nLifever ${version}`);
  console.log(`API: ${apiUrl}`);
  console.log(`Release repository: ${releaseRepository}`);
  console.log(`Homebrew tap: ${homebrewTapUrl}`);
  console.log(
    `macOS signing: ${signingStatus.trusted ? "Developer ID + notarization" : "ad-hoc"}`,
  );
  if (dryRun) {
    console.log("Mode: dry run (no deployment, tag, release, or tap update)");
    return;
  }
  console.log(
    `Deployment: ${skipDeploy ? "skipped" : "D1 migrations + Cloudflare Worker"}`,
  );
  if (!signingStatus.trusted && allowAdHoc) {
    console.warn(
      "Publishing an ad-hoc build because --allow-ad-hoc was explicitly provided.",
    );
  }

  if (yes) return;
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("Use --yes for a non-interactive production release.");
  }

  const prompt = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const answer = await prompt.question("\nPublish this release? [y/N] ");
  prompt.close();
  if (!["y", "yes"].includes(answer.trim().toLowerCase())) {
    throw new Error("Release cancelled.");
  }
}

async function buildUniversalDmg({ apiUrl, signingStatus, version }) {
  await run("pnpm", ["check"]);
  await run("rustup", [
    "target",
    "add",
    "aarch64-apple-darwin",
    "x86_64-apple-darwin",
  ]);
  await rm(bundleDirectory, { force: true, recursive: true });
  await run(
    "pnpm",
    [
      "--filter",
      "@lifever/desktop",
      "tauri",
      "build",
      "--bundles",
      "app,dmg",
      "--target",
      "universal-apple-darwin",
      "--ci",
    ],
    {
      env: {
        ...process.env,
        VITE_API_URL: apiUrl,
      },
    },
  );

  await run("/usr/bin/codesign", [
    "--verify",
    "--deep",
    "--strict",
    appPath,
  ]);
  const architectures = await run("/usr/bin/lipo", [
    "-archs",
    appExecutable,
  ], { capture: true });
  for (const architecture of ["arm64", "x86_64"]) {
    if (!architectures.stdout.split(/\s+/).includes(architecture)) {
      throw new Error(`Desktop build is missing ${architecture}.`);
    }
  }

  const dmgs = (await readdir(dmgDirectory))
    .filter((fileName) => fileName.endsWith(".dmg"));
  if (dmgs.length !== 1) {
    throw new Error(
      `Expected one DMG in ${dmgDirectory}, found ${dmgs.length}.`,
    );
  }

  const builtDmg = path.join(dmgDirectory, dmgs[0]);
  await run("/usr/bin/hdiutil", ["verify", builtDmg]);
  await mkdir(releaseAssetsDirectory, { recursive: true });
  const assetPath = path.join(
    releaseAssetsDirectory,
    releaseAssetName(version),
  );
  await copyFile(builtDmg, assetPath);
  const sha256 = createHash("sha256")
    .update(await readFile(assetPath))
    .digest("hex");

  console.log(`Universal architectures: ${architectures.stdout}`);
  console.log(`Release asset: ${assetPath}`);
  console.log(`SHA-256: ${sha256}`);
  if (!signingStatus.trusted) {
    console.warn(
      "This release is ad-hoc signed. Set APPLE_SIGNING_IDENTITY and Apple notarization credentials for a trusted public build.",
    );
  }

  return { assetPath, sha256 };
}

async function createReleaseNotes({ notesPath, signingStatus, version }) {
  if (notesPath) {
    return readFile(path.resolve(projectRoot, notesPath), "utf8");
  }

  const previousTag = await run(
    "git",
    ["describe", "--tags", "--abbrev=0", "--match", "v*", "HEAD^"],
    { allowFailure: true, capture: true },
  );
  const range = previousTag.code === 0
    ? `${previousTag.stdout}..HEAD`
    : "HEAD";
  const log = await run(
    "git",
    ["log", "--pretty=format:- %s", "--no-merges", range],
    { capture: true },
  );
  const changes =
    log.stdout
      .split("\n")
      .filter(
        (line) =>
          line &&
          !line.includes("homebrew") &&
          !line.startsWith("- chore(release):"),
      )
      .join("\n") || "- Maintenance and reliability improvements";
  const signingNote = signingStatus.trusted
    ? ""
    : "\n> This build is ad-hoc signed. macOS may ask you to allow Lifever in System Settings → Privacy & Security on first launch.\n";

  return `## Install

\`\`\`bash
brew tap ${homebrewTapName} ${homebrewTapUrl}
brew trust --cask badosz0/lifever/lifever
brew install lifever
\`\`\`

### macOS

Universal build for Apple silicon and Intel. Requires macOS 12 or newer.
${signingNote}
### Windows

[Download the Windows 10/11 x64 installer](https://github.com/${releaseRepository}/releases/latest/download/${windowsReleaseAssetName}). The installer is built from this release tag by GitHub Actions and may take a few minutes to appear.

## Changes

${changes}
`;
}

async function ensureSourceTag({ head, tag, tagExists, version }) {
  if (!tagExists) {
    await run("git", [
      "tag",
      "-a",
      tag,
      head,
      "-m",
      `Lifever ${version}`,
    ]);
  }

  const remoteTag = await run(
    "git",
    ["ls-remote", "--exit-code", "--tags", "origin", `refs/tags/${tag}`],
    { allowFailure: true, capture: true },
  );
  if (remoteTag.code !== 0) {
    await run("git", ["push", "origin", tag]);
  }
}

async function publishGithubRelease({
  assetPath,
  notes,
  tag,
  version,
}) {
  const existingRelease = await run(
    "gh",
    ["release", "view", tag, "--repo", releaseRepository],
    { allowFailure: true, capture: true },
  );
  if (existingRelease.code === 0) {
    await run("gh", [
      "release",
      "upload",
      tag,
      assetPath,
      "--clobber",
      "--repo",
      releaseRepository,
    ]);
    return;
  }

  const notesDirectory = await mkdtemp(
    path.join(tmpdir(), "lifever-release-notes-"),
  );
  const notesFile = path.join(notesDirectory, "notes.md");
  try {
    await writeFile(notesFile, notes);
    const args = [
      "release",
      "create",
      tag,
      assetPath,
      "--repo",
      releaseRepository,
      "--title",
      `Lifever ${version}`,
      "--notes-file",
      notesFile,
    ];
    args.push(version.includes("-") ? "--prerelease" : "--latest");
    await run("gh", args);
  } finally {
    await rm(notesDirectory, { force: true, recursive: true });
  }
}

async function updateHomebrewCask({ sha256, version }) {
  const casksDirectory = path.join(projectRoot, "Casks");
  const caskPath = path.join(casksDirectory, "lifever.rb");
  await mkdir(casksDirectory, { recursive: true });
  await writeFile(caskPath, renderHomebrewCask({ sha256, version }));

  await run("git", ["add", "Casks/lifever.rb"]);
  const changes = await run("git", ["diff", "--cached", "--quiet"], {
    allowFailure: true,
  });
  if (changes.code === 0) {
    console.log("Homebrew cask is already current.");
    return;
  }
  await run("git", [
    "commit",
    "-m",
    `chore(homebrew): update Lifever to ${version}`,
  ]);
  await run("git", ["push", "origin", "main"]);
}

async function waitForWindowsInstaller(tag) {
  const timeoutAt = Date.now() + 30 * 60 * 1_000;
  const actionsUrl = `https://github.com/${releaseRepository}/actions/workflows/${windowsReleaseWorkflow}`;
  console.log("\nWaiting for the Windows installer built by GitHub Actions...");

  while (Date.now() < timeoutAt) {
    const assets = await run(
      "gh",
      [
        "release",
        "view",
        tag,
        "--repo",
        releaseRepository,
        "--json",
        "assets",
        "--jq",
        ".assets[].name",
      ],
      { allowFailure: true, capture: true },
    );
    if (assets.stdout.split("\n").includes(windowsReleaseAssetName)) {
      console.log(`Windows release asset: ${windowsReleaseAssetName}`);
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 15_000));
  }

  throw new Error(
    `The Windows installer did not appear within 30 minutes. Check ${actionsUrl}, then rerun the workflow for ${tag}.`,
  );
}

async function main() {
  if (process.platform !== "darwin") {
    throw new Error("Lifever macOS releases must be built on macOS.");
  }

  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const version = await getVersion();
  const repository = await assertRepositoryReady(version);
  const signingStatus = getSigningStatus();
  const { apiUrl } = await ensureDesktopConfig({
    interactive: false,
    requestedApiUrl: options.apiUrl,
  });
  if (!options.dryRun && !apiUrl.startsWith("https://")) {
    throw new Error("Public releases must use an HTTPS API URL.");
  }
  if (
    !options.dryRun &&
    !options.allowAdHoc &&
    !signingStatus.trusted
  ) {
    throw new Error(
      "Public releases require APPLE_SIGNING_IDENTITY plus either APPLE_API_ISSUER/APPLE_API_KEY/APPLE_API_KEY_PATH or APPLE_ID/APPLE_PASSWORD/APPLE_TEAM_ID. Use --allow-ad-hoc only for an intentional unnotarized release.",
    );
  }
  await confirmRelease({
    ...options,
    apiUrl,
    signingStatus,
    version,
  });
  const artifact = await buildUniversalDmg({
    apiUrl,
    signingStatus,
    version,
  });
  if (options.dryRun) {
    console.log("\nDry run complete. Nothing was deployed or published.");
    return;
  }

  if (!options.skipDeploy) {
    await run("pnpm", ["deploy:api"]);
  }
  const notes = await createReleaseNotes({
    notesPath: options.notesPath,
    signingStatus,
    version,
  });
  await ensureSourceTag({ ...repository, version });
  await publishGithubRelease({
    ...artifact,
    notes,
    tag: repository.tag,
    version,
  });
  if (!options.skipWindowsWait) {
    await waitForWindowsInstaller(repository.tag);
  }
  await updateHomebrewCask({
    sha256: artifact.sha256,
    version,
  });

  console.log(`\nPublished Lifever ${version}.`);
  console.log(
    `Release: https://github.com/${releaseRepository}/releases/tag/${repository.tag}`,
  );
  console.log("Install:");
  console.log(`  brew tap ${homebrewTapName} ${homebrewTapUrl}`);
  console.log("  brew trust --cask badosz0/lifever/lifever");
  console.log("  brew install lifever");
}

main().catch((error) => {
  console.error(`\nRelease failed: ${error.message}`);
  process.exitCode = 1;
});
