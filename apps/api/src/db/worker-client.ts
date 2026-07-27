import { PrismaD1 } from "@prisma/adapter-d1";

import { PrismaClient } from "../generated/prisma/client.js";
import type { AppPrisma } from "./types.js";

export const createWorkerPrisma = (database: D1Database): AppPrisma => {
  const adapter = new PrismaD1(database);

  return new PrismaClient({ adapter }) as AppPrisma;
};
