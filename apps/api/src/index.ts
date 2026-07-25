import { serve } from "@hono/node-server";

import { createApp } from "./app.js";
import { nodeConfig } from "./config/node-env.js";
import { getNodePrisma } from "./db/client.js";

const app = createApp({
  config: nodeConfig,
  prisma: getNodePrisma(nodeConfig),
});

serve(
  {
    fetch: app.fetch,
    port: nodeConfig.port,
  },
  ({ port }) => {
    console.log(`Lifever API is listening on http://localhost:${port}`);
  },
);
