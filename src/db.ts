import { PrismaClient } from "@prisma/client";

// Singleton so we don't spin up a new connection pool on every hot reload.
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});
