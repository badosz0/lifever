import { serve } from "@hono/node-server";

import { app } from "./app.js";
import { env } from "./config/env.js";

serve(
  {
    fetch: app.fetch,
    port: env.port,
  },
  ({ port }) => {
    console.log(`Lifever API is listening on http://localhost:${port}`);
  },
);

