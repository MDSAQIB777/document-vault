import { prisma } from "./db.ts";

export type GraphQLContext = {
  prisma: typeof prisma;
};

export function createContext(): GraphQLContext {
  return { prisma };
}
