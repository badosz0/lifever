import { createApp } from "./app.js";
import { createApiConfig, type ApiEnvironment } from "./config/env.js";
import { createWorkerPrisma } from "./db/worker-client.js";

export interface WorkerBindings extends ApiEnvironment {
  DB: D1Database;
}

const getWorkerEnvironment = (bindings: WorkerBindings): ApiEnvironment => ({
  NODE_ENV: "production",
  PORT: bindings.PORT,
  BETTER_AUTH_SECRET: bindings.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: bindings.BETTER_AUTH_URL,
  WEB_URL: bindings.WEB_URL,
  DISCORD_CLIENT_ID: bindings.DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET: bindings.DISCORD_CLIENT_SECRET,
  GOOGLE_CLIENT_ID: bindings.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: bindings.GOOGLE_CLIENT_SECRET,
});

export default {
  async fetch(request, bindings, executionContext) {
    const config = createApiConfig(getWorkerEnvironment(bindings), {
      databaseProvider: "sqlite",
      defaultAuthUrl: new URL(request.url).origin,
      usesDatabaseBinding: true,
    });
    const prisma = createWorkerPrisma(bindings.DB);

    try {
      const app = createApp({ config, prisma });
      return await app.fetch(request, bindings, executionContext);
    } finally {
      executionContext.waitUntil(prisma.$disconnect());
    }
  },
} satisfies ExportedHandler<WorkerBindings>;
