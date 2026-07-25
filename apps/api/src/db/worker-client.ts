import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma-worker/client.js";
import type { AppPrisma } from "./types.js";

export const createWorkerPrisma = (databaseUrl: string): AppPrisma => {
  const adapter = new PrismaPg({ connectionString: databaseUrl });

  // Both generated clients expose the same schema API. They differ only in the
  // runtime code Prisma emits for Node.js and workerd.
  return new PrismaClient({ adapter }) as unknown as AppPrisma;
};
