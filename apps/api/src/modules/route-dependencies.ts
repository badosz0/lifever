import type { ApiConfig } from "../config/env.js";
import type { AppPrisma } from "../db/types.js";
import type { SessionMiddleware } from "./auth/session.js";

export type RouteDependencies = {
  config: ApiConfig;
  prisma: AppPrisma;
  requireSession: SessionMiddleware;
};
