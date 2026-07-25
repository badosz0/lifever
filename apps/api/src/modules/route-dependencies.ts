import type { AppPrisma } from "../db/types.js";
import type { SessionMiddleware } from "./auth/session.js";

export type RouteDependencies = {
  prisma: AppPrisma;
  requireSession: SessionMiddleware;
};
