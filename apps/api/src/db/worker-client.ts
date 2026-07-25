import { PrismaD1 } from "@prisma/adapter-d1";

import { PrismaClient } from "../generated/prisma-d1/client.js";
import type { AppPrisma } from "./types.js";

export const createWorkerPrisma = (database: D1Database): AppPrisma => {
  const adapter = new PrismaD1(database);

  // Both generated clients expose the same schema API. They differ only in the
  // runtime code Prisma emits for Node.js and workerd.
  return new PrismaClient({ adapter }) as unknown as AppPrisma;
};
