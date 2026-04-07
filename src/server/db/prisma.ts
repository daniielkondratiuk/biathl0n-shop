import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const shouldLogQueries = process.env.PRISMA_LOG_QUERIES === "true";
  return new PrismaClient({
    log: shouldLogQueries ? ["query", "error", "warn"] : ["error", "warn"],
  });
}

export const prisma = (globalForPrisma.prisma ??= createPrismaClient());
