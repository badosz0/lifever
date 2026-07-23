import { config } from "dotenv";
import { fileURLToPath } from "node:url";

config({
  path: fileURLToPath(new URL("../../../../.env", import.meta.url)),
  quiet: true,
});

const developmentSecret = "lifever-development-secret-change-before-release";
const localDatabaseUrl =
  "postgresql://lifever:lifever@localhost:5432/lifever?schema=public";

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 8787),
  databaseUrl: process.env.DATABASE_URL ?? localDatabaseUrl,
  authSecret: process.env.BETTER_AUTH_SECRET ?? developmentSecret,
  authUrl: process.env.BETTER_AUTH_URL ?? "http://localhost:8787",
  webUrl: process.env.WEB_URL ?? "http://localhost:5173",
  discordClientId: process.env.DISCORD_CLIENT_ID,
  discordClientSecret: process.env.DISCORD_CLIENT_SECRET,
};

export const discordIsConfigured = Boolean(
  env.discordClientId && env.discordClientSecret,
);

if (env.nodeEnv === "production") {
  if (env.authSecret === developmentSecret) {
    throw new Error("BETTER_AUTH_SECRET must be configured in production.");
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be configured in production.");
  }
}
