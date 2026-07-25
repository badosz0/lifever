import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { projectRoot } from "./lib/desktop-config.mjs";

const version = process.argv[2];
const semverPattern =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/;

if (!version || !semverPattern.test(version)) {
  console.error("Usage: pnpm release:version <major.minor.patch>");
  process.exit(1);
}

const packagePaths = [
  "package.json",
  "apps/api/package.json",
  "apps/web/package.json",
  "apps/desktop/package.json",
];

for (const relativePath of packagePaths) {
  const filePath = path.join(projectRoot, relativePath);
  const packageJson = JSON.parse(await readFile(filePath, "utf8"));
  packageJson.version = version;
  await writeFile(filePath, `${JSON.stringify(packageJson, null, 2)}\n`);
}

const tauriConfigPath = path.join(
  projectRoot,
  "apps/desktop/src-tauri/tauri.conf.json",
);
const tauriConfig = JSON.parse(await readFile(tauriConfigPath, "utf8"));
tauriConfig.version = version;
await writeFile(
  tauriConfigPath,
  `${JSON.stringify(tauriConfig, null, 2)}\n`,
);

const cargoManifestPath = path.join(
  projectRoot,
  "apps/desktop/src-tauri/Cargo.toml",
);
const cargoManifest = await readFile(cargoManifestPath, "utf8");
const nextCargoManifest = cargoManifest.replace(
  /(\[package\]\s+name = "lifever"\s+version = ")[^"]+(")/,
  `$1${version}$2`,
);
if (nextCargoManifest === cargoManifest) {
  throw new Error("Could not update the Lifever version in Cargo.toml.");
}
await writeFile(cargoManifestPath, nextCargoManifest);

const cargoLockPath = path.join(
  projectRoot,
  "apps/desktop/src-tauri/Cargo.lock",
);
const cargoLock = await readFile(cargoLockPath, "utf8");
const nextCargoLock = cargoLock.replace(
  /(\[\[package\]\]\s+name = "lifever"\s+version = ")[^"]+(")/,
  `$1${version}$2`,
);
if (nextCargoLock === cargoLock) {
  throw new Error("Could not update the Lifever version in Cargo.lock.");
}
await writeFile(cargoLockPath, nextCargoLock);

console.log(`Set every Lifever package and desktop version to ${version}.`);
console.log("Review, commit, and push the version change before releasing.");

