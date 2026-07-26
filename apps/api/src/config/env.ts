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
  GOOGLE_CALENDAR_CLIENT_ID?: string;
  GOOGLE_CALENDAR_CLIENT_SECRET?: string;
  CALENDAR_TOKEN_ENCRYPTION_KEY?: string;
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
  const googleCalendarClientId = environment.GOOGLE_CALENDAR_CLIENT_ID;
  const googleCalendarClientSecret =
    environment.GOOGLE_CALENDAR_CLIENT_SECRET;
  const calendarTokenEncryptionKey =
    environment.CALENDAR_TOKEN_ENCRYPTION_KEY ?? authSecret;
  const googleCalendarConfigured = Boolean(
    googleCalendarClientId && googleCalendarClientSecret,
  );

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

  if (
    nodeEnv === "production" &&
    googleCalendarConfigured &&
    !environment.CALENDAR_TOKEN_ENCRYPTION_KEY
  ) {
    throw new Error(
      "CALENDAR_TOKEN_ENCRYPTION_KEY must be configured with Google Calendar in production.",
    );
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
    googleCalendarClientId,
    googleCalendarClientSecret,
    calendarTokenEncryptionKey,
    googleCalendarConfigured,
  };
};
