const developmentSecret = "lifever-development-secret-change-before-release";
const localDatabaseUrl =
  "postgresql://lifever:lifever@localhost:5432/lifever?schema=public";

export type ApiEnvironment = {
  NODE_ENV?: string;
  PORT?: string;
  DATABASE_URL?: string;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  WEB_URL?: string;
  DISCORD_CLIENT_ID?: string;
  DISCORD_CLIENT_SECRET?: string;
};

export type ApiConfig = ReturnType<typeof createApiConfig>;

export type ApiConfigOptions = {
  defaultAuthUrl?: string;
  databaseProvider?: "postgresql" | "sqlite";
  databaseUrl?: string;
  usesDatabaseBinding?: boolean;
};

export const createApiConfig = (
  environment: ApiEnvironment,
  options: ApiConfigOptions = {},
) => {
  const nodeEnv = environment.NODE_ENV ?? "development";
  const databaseUrl =
    options.databaseUrl ?? environment.DATABASE_URL ?? localDatabaseUrl;
  const authSecret = environment.BETTER_AUTH_SECRET ?? developmentSecret;

  if (nodeEnv === "production" && authSecret === developmentSecret) {
    throw new Error("BETTER_AUTH_SECRET must be configured in production.");
  }

  if (
    nodeEnv === "production" &&
    !options.usesDatabaseBinding &&
    !options.databaseUrl &&
    !environment.DATABASE_URL
  ) {
    throw new Error("DATABASE_URL must be configured in production.");
  }

  return {
    nodeEnv,
    port: Number(environment.PORT ?? 8787),
    databaseProvider: options.databaseProvider ?? "postgresql",
    databaseUrl,
    authSecret,
    authUrl:
      environment.BETTER_AUTH_URL ??
      options.defaultAuthUrl ??
      "http://localhost:8787",
    webUrl: environment.WEB_URL ?? "http://localhost:5173",
    discordClientId: environment.DISCORD_CLIENT_ID,
    discordClientSecret: environment.DISCORD_CLIENT_SECRET,
  };
};
