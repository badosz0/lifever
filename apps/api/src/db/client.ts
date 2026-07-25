import { PrismaPg } from "@prisma/adapter-pg";

import type { ApiConfig } from "../config/env.js";
import { PrismaClient } from "../generated/prisma/client.js";

const createPrismaClient = (databaseUrl: string) => {
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  return new PrismaClient({ adapter });
};

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
};

export const getNodePrisma = (config: ApiConfig) => {
  const prisma =
    globalForPrisma.prisma ?? createPrismaClient(config.databaseUrl);

  if (config.nodeEnv !== "production") {
    globalForPrisma.prisma = prisma;
  }

  return prisma;
};
