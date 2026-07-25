import { createApp } from "./app.js";
import { createApiConfig, type ApiEnvironment } from "./config/env.js";
import { createWorkerPrisma } from "./db/worker-client.js";

type HyperdriveBinding = {
  connectionString: string;
};

export interface WorkerBindings extends ApiEnvironment {
  HYPERDRIVE?: HyperdriveBinding;
}

const getWorkerEnvironment = (bindings: WorkerBindings): ApiEnvironment => ({
  NODE_ENV: "production",
  PORT: bindings.PORT,
  DATABASE_URL: bindings.DATABASE_URL,
  BETTER_AUTH_SECRET: bindings.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: bindings.BETTER_AUTH_URL,
  WEB_URL: bindings.WEB_URL,
  DISCORD_CLIENT_ID: bindings.DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET: bindings.DISCORD_CLIENT_SECRET,
});

export default {
  async fetch(request, bindings, executionContext) {
    const databaseUrl =
      bindings.HYPERDRIVE?.connectionString ?? bindings.DATABASE_URL;
    const config = createApiConfig(getWorkerEnvironment(bindings), {
      databaseUrl,
      defaultAuthUrl: new URL(request.url).origin,
    });
    const prisma = createWorkerPrisma(config.databaseUrl);

    try {
      const app = createApp({ config, prisma });
      return await app.fetch(request, bindings, executionContext);
    } finally {
      executionContext.waitUntil(prisma.$disconnect());
    }
  },
} satisfies ExportedHandler<WorkerBindings>;
