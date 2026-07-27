import { spawn } from "node:child_process";
import {
  access,
  constants,
  mkdir,
  rename,
  rm,
  stat,
} from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

import {
  ensureDesktopConfig,
  projectRoot,
} from "./lib/desktop-config.mjs";

const productName = "Lifever";
const bundleIdentifier = "app.lifever.desktop";
const launchServicesRegister =
  "/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister";
const appPath = path.join(
  projectRoot,
  "apps/desktop/src-tauri/target/release/bundle/macos/Lifever.app",
);
const dmgDirectory = path.join(
  projectRoot,
  "apps/desktop/src-tauri/target/release/bundle/dmg",
);

function printHelp() {
  console.log(`Usage: pnpm desktop:<command> [-- options]

Commands:
  desktop:configure  Save the public API URL used by desktop builds
  desktop:dev        Start the Tauri development app
  desktop:build      Build the macOS app and DMG
  desktop:app        Build and open the app bundle without installing it
  desktop:install    Build, install, verify, and open the app
  desktop:update     Rebuild and replace the installed app

Options:
  --api-url <url>       Set or replace the public API origin
  --install-dir <path>  Override the Applications directory
  --no-open             Do not open the app after building or installing
`);
}

function parseArguments(argv) {
  const args = argv.filter((argument) => argument !== "--");
  const command = args.shift() ?? "help";
  const options = {
    apiUrl: undefined,
    installDirectory: undefined,
    open: true,
  };

  while (args.length > 0) {
    const argument = args.shift();
    if (argument === "--api-url") {
      options.apiUrl = args.shift();
      if (!options.apiUrl) throw new Error("--api-url requires a value.");
    } else if (argument === "--install-dir") {
      options.installDirectory = args.shift();
      if (!options.installDirectory) {
        throw new Error("--install-dir requires a value.");
      }
    } else if (argument === "--no-open") {
      options.open = false;
    } else if (argument === "--help" || argument === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown option: ${argument}`);
    }
  }

  return { command, options };
}

function run(command, args, { allowFailure = false, env = process.env } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      env,
      stdio: "inherit",
    });

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0 || allowFailure) {
        resolve(code ?? 1);
        return;
      }

      reject(
        new Error(
          signal
            ? `${command} stopped after receiving ${signal}`
            : `${command} exited with code ${code ?? "unknown"}`,
        ),
      );
    });
  });
}

async function pathExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function canWrite(directory) {
  try {
    await access(directory, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function expandHome(filePath) {
  if (filePath === "~") return homedir();
  if (filePath.startsWith("~/")) return path.join(homedir(), filePath.slice(2));
  return filePath;
}

async function resolveInstallDirectory(requestedDirectory) {
  if (requestedDirectory) {
    const directory = path.resolve(expandHome(requestedDirectory));
    await mkdir(directory, { recursive: true });
    if (!(await canWrite(directory))) {
      throw new Error(`Install directory is not writable: ${directory}`);
    }
    return directory;
  }

  const systemApplications = "/Applications";
  if (await canWrite(systemApplications)) return systemApplications;

  const userApplications = path.join(homedir(), "Applications");
  await mkdir(userApplications, { recursive: true });
  return userApplications;
}

async function buildDesktop(apiUrl, bundles) {
  await run(
    "pnpm",
    [
      "--filter",
      "@lifever/desktop",
      "tauri",
      "build",
      "--bundles",
      bundles,
      "--ci",
    ],
    {
      env: {
        ...process.env,
        VITE_API_URL: apiUrl,
      },
    },
  );
}

async function verifyAppBundle(bundlePath) {
  await run("/usr/bin/codesign", [
    "--verify",
    "--deep",
    "--strict",
    bundlePath,
  ]);
}

async function registerAppBundle(bundlePath) {
  await run(launchServicesRegister, ["-f", bundlePath]);
}

async function stopInstalledApp(destination) {
  if (!(await pathExists(destination))) return;

  await run(
    "/usr/bin/osascript",
    ["-e", `tell application id "${bundleIdentifier}" to quit`],
    { allowFailure: true },
  );
  await new Promise((resolve) => setTimeout(resolve, 600));
}

async function installAppBundle(requestedDirectory) {
  await verifyAppBundle(appPath);

  const installDirectory =
    await resolveInstallDirectory(requestedDirectory);
  const destination = path.join(installDirectory, `${productName}.app`);
  const staging = path.join(
    installDirectory,
    `.${productName}.install-${process.pid}.app`,
  );
  const backup = path.join(
    installDirectory,
    `.${productName}.backup-${process.pid}.app`,
  );

  await stopInstalledApp(destination);
  await Promise.all([
    rm(staging, { force: true, recursive: true }),
    rm(backup, { force: true, recursive: true }),
  ]);
  await run("/usr/bin/ditto", [appPath, staging]);

  let hasBackup = false;
  let installedNewBundle = false;
  try {
    if (await pathExists(destination)) {
      await rename(destination, backup);
      hasBackup = true;
    }
    await rename(staging, destination);
    installedNewBundle = true;
    await verifyAppBundle(destination);
    await registerAppBundle(destination);
    if (hasBackup) await rm(backup, { force: true, recursive: true });
  } catch (error) {
    await rm(staging, { force: true, recursive: true });
    if (installedNewBundle) {
      await rm(destination, { force: true, recursive: true });
    }
    if (hasBackup) await rename(backup, destination);
    throw error;
  }

  return destination;
}

async function reportApiStatus(apiUrl) {
  try {
    const response = await fetch(new URL("/api/health", `${apiUrl}/`), {
      signal: AbortSignal.timeout(2_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    console.log(`API reachable at ${apiUrl}`);
  } catch {
    console.warn(
      `API is not reachable at ${apiUrl}; sign-in and synced apps will be unavailable.`,
    );
  }
}

async function main() {
  if (process.platform !== "darwin") {
    throw new Error("Lifever desktop commands currently support macOS only.");
  }

  const { command, options } = parseArguments(process.argv.slice(2));
  if (command === "help" || options.help) {
    printHelp();
    return;
  }

  const { apiUrl, configPath } = await ensureDesktopConfig({
    requestedApiUrl: options.apiUrl,
  });

  if (command === "configure") {
    await reportApiStatus(apiUrl);
    console.log(`Desktop API: ${apiUrl}`);
    console.log(`Configuration: ${configPath}`);
    return;
  }
  if (command === "dev") {
    await run(
      "pnpm",
      ["--filter", "@lifever/desktop", "tauri", "dev"],
      { env: { ...process.env, VITE_API_URL: apiUrl } },
    );
    return;
  }
  if (command === "build") {
    await buildDesktop(apiUrl, "app,dmg");
    console.log(`App: ${appPath}`);
    console.log(`DMG directory: ${dmgDirectory}`);
    return;
  }
  if (command === "app") {
    await buildDesktop(apiUrl, "app");
    await verifyAppBundle(appPath);
    if (options.open) await run("/usr/bin/open", ["-n", appPath]);
    console.log(`App: ${appPath}`);
    return;
  }
  if (command === "install" || command === "update") {
    await buildDesktop(apiUrl, "app");
    const destination = await installAppBundle(options.installDirectory);
    await reportApiStatus(apiUrl);
    if (options.open) await run("/usr/bin/open", ["-n", destination]);
    console.log(`${command === "update" ? "Updated" : "Installed"} ${destination}`);
    console.log("App data and login state were preserved.");
    return;
  }

  throw new Error(`Unknown desktop command: ${command}`);
}

main().catch((error) => {
  console.error(`\nDesktop command failed: ${error.message}`);
  process.exitCode = 1;
});
