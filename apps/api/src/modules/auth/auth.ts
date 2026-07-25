import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import type { ApiConfig } from "../../config/env.js";
import type { AppPrisma } from "../../db/types.js";

const desktopOrigins = ["tauri://localhost", "https://tauri.localhost"];

type AuthDependencies = {
  config: ApiConfig;
  prisma: AppPrisma;
};

export const createAuth = ({ config, prisma }: AuthDependencies) => {
  const discordIsConfigured = Boolean(
    config.discordClientId && config.discordClientSecret,
  );

  return betterAuth({
    appName: "Lifever",
    baseURL: config.authUrl,
    secret: config.authSecret,
    database: prismaAdapter(prisma, {
      provider: config.databaseProvider,
    }),
    trustedOrigins: [config.webUrl, ...desktopOrigins],
    socialProviders: discordIsConfigured
      ? {
          discord: {
            clientId: config.discordClientId!,
            clientSecret: config.discordClientSecret!,
            mapProfileToUser: (profile) => ({
              email: profile.email ?? `${profile.id}@discord.invalid`,
            }),
          },
        }
      : {},
    advanced: {
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: config.nodeEnv === "production" ? "none" : "lax",
        secure: config.nodeEnv === "production",
      },
    },
  });
};

export type AppAuth = ReturnType<typeof createAuth>;
