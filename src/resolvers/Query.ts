import type { Prisma } from "@prisma/client";
import type { GraphQLContext } from "../context.ts";
import { decodeCursor, encodeCursor } from "../cursor.ts";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export const Query = {
  collections: (_parent: unknown, _args: unknown, ctx: GraphQLContext) => {
    return ctx.prisma.collection.findMany({
      orderBy: { createdAt: "desc" },
    });
  },

  // Returns null when not found — the schema marks Collection as nullable
  // here on purpose, so we honor that instead of throwing a GraphQLError
  // (unlike updateDocument/deleteDocument, where there's no such signal
  // in the schema and an explicit NOT_FOUND error is the better fit).
  collection: (
    _parent: unknown,
    args: { id: string },
    ctx: GraphQLContext
  ) => {
    return ctx.prisma.collection.findUnique({
      where: { id: args.id },
    });
  },

  documents: async (
    _parent: unknown,
    args: {
      collectionId?: string;
      search?: string;
      isArchived?: boolean;
      take?: number;
      cursor?: string;
    },
    ctx: GraphQLContext
  ) => {
    const take = Math.min(args.take ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    const where: Prisma.DocumentWhereInput = {
      ...(args.collectionId ? { collectionId: args.collectionId } : {}),
      ...(args.isArchived !== undefined ? { isArchived: args.isArchived } : {}),
      ...(args.search
        ? {
            OR: [
              { title: { contains: args.search, mode: "insensitive" } },
              { content: { contains: args.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.DocumentOrderByWithRelationInput[] = [
      { createdAt: "desc" },
      { id: "desc" },
    ];

    const rows = await ctx.prisma.document.findMany({
      where,
      orderBy,
      take: take + 1,
      ...(args.cursor
        ? { cursor: { id: decodeCursor(args.cursor).id }, skip: 1 }
        : {}),
    });

    const hasNextPage = rows.length > take;
    const page = hasNextPage ? rows.slice(0, take) : rows;

    return {
      edges: page.map((doc) => ({
        cursor: encodeCursor(doc),
        node: doc,
      })),
      pageInfo: {
        hasNextPage,
        endCursor: page.length > 0 ? encodeCursor(page[page.length - 1]!) : null,
      },
    };
  },
};