import type {
  Collection as CollectionModel,
  Document as DocumentModel,
} from "@prisma/client";
import type { GraphQLContext } from "../context.ts";

export const Collection = {
  // Nested documents on a single collection fetch (used by
  // Query.collection). Kept as a field resolver so `collections`
  // (the list query) doesn't eagerly load documents it doesn't need.
  documents: (
    parent: CollectionModel,
    _args: unknown,
    ctx: GraphQLContext
  ) => {
    return ctx.prisma.document.findMany({
      where: { collectionId: parent.id },
      orderBy: { createdAt: "desc" },
    });
  },
};

export const Document = {
  collection: (
    parent: DocumentModel,
    _args: unknown,
    ctx: GraphQLContext
  ) => {
    return ctx.prisma.collection.findUniqueOrThrow({
      where: { id: parent.collectionId },
    });
  },
};