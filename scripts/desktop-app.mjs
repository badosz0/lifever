import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const appPath = path.join(
  projectRoot,
  "apps/desktop/src-tauri/target/release/bundle/macos/Lifever.app",
);

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      stdio: "inherit",
    });

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
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

if (process.platform !== "darwin") {
  throw new Error("desktop:app currently supports macOS only");
}

await run("pnpm", [
  "--filter",
  "@lifever/desktop",
  "tauri",
  "build",
  "--bundles",
  "app",
  "--ci",
]);
await run("open", ["-n", appPath]);

console.log(`Opened ${appPath}`);
