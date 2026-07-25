import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { discordIsConfigured, env } from "../../config/env.js";
import { prisma } from "../../db/client.js";

const desktopOrigins = ["tauri://localhost", "https://tauri.localhost"];

export const auth = betterAuth({
  appName: "Lifever",
  baseURL: env.authUrl,
  secret: env.authSecret,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  trustedOrigins: [env.webUrl, ...desktopOrigins],
  socialProviders: discordIsConfigured
    ? {
        discord: {
          clientId: env.discordClientId!,
          clientSecret: env.discordClientSecret!,
          mapProfileToUser: (profile) => ({
            email: profile.email ?? `${profile.id}@discord.invalid`,
          }),
        },
      }
    : {},
  advanced: {
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: env.nodeEnv === "production" ? "none" : "lax",
      secure: env.nodeEnv === "production",
    },
  },
});
