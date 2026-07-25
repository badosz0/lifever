import { config } from "dotenv";
import { fileURLToPath } from "node:url";

import { createApiConfig } from "./env.js";

config({
  path: fileURLToPath(new URL("../../../../.env", import.meta.url)),
  quiet: true,
});

export const nodeConfig = createApiConfig(process.env);
