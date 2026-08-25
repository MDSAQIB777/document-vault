import type { GraphQLContext } from "../context.ts";
import {
  assertNonEmpty,
  assertValidSlug,
  isForeignKeyViolation,
  isRecordNotFound,
  notFound,
} from "../errors.ts";

type CreateCollectionInput = { name: string; slug: string };
type CreateDocumentInput = {
  title: string;
  content: string;
  collectionId: string;
  tags?: string[];
};
type UpdateDocumentInput = {
  title?: string;
  content?: string;
  tags?: string[];
  isArchived?: boolean;
};

export const Mutation = {
  createCollection: (
    _parent: unknown,
    args: { input: CreateCollectionInput },
    ctx: GraphQLContext
  ) => {
    const name = assertNonEmpty(args.input.name, "name");
    const slug = assertValidSlug(args.input.slug);

    return ctx.prisma.collection.create({
      data: { name, slug },
    });
  },

  createDocument: async (
    _parent: unknown,
    args: { input: CreateDocumentInput },
    ctx: GraphQLContext
  ) => {
    const title = assertNonEmpty(args.input.title, "title");
    const content = assertNonEmpty(args.input.content, "content");
    const tags = args.input.tags ?? [];

    try {
      return await ctx.prisma.document.create({
        data: {
          title,
          content,
          tags,
          collectionId: args.input.collectionId,
        },
      });
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        notFound("Collection", args.input.collectionId);
      }
      throw error;
    }
  },

  updateDocument: async (
    _parent: unknown,
    args: { id: string; input: UpdateDocumentInput },
    ctx: GraphQLContext
  ) => {
    const data: {
      title?: string;
      content?: string;
      tags?: string[];
      isArchived?: boolean;
    } = {
      ...(args.input.title !== undefined
        ? { title: assertNonEmpty(args.input.title, "title") }
        : {}),
      ...(args.input.content !== undefined
        ? { content: assertNonEmpty(args.input.content, "content") }
        : {}),
      ...(args.input.tags !== undefined ? { tags: args.input.tags } : {}),
      ...(args.input.isArchived !== undefined
        ? { isArchived: args.input.isArchived }
        : {}),
    };

    try {
      return await ctx.prisma.document.update({
        where: { id: args.id },
        data,
      });
    } catch (error) {
      if (isRecordNotFound(error)) {
        notFound("Document", args.id);
      }
      throw error;
    }
  },

  deleteDocument: async (
    _parent: unknown,
    args: { id: string },
    ctx: GraphQLContext
  ) => {
    try {
      await ctx.prisma.document.delete({ where: { id: args.id } });
      return true;
    } catch (error) {
      if (isRecordNotFound(error)) {
        return false;
      }
      throw error;
    }
  },

  moveDocument: async (
    _parent: unknown,
    args: { id: string; collectionId: string },
    ctx: GraphQLContext
  ) => {
    try {
      return await ctx.prisma.document.update({
        where: { id: args.id },
        data: { collectionId: args.collectionId },
      });
    } catch (error) {
      if (isRecordNotFound(error)) {
        notFound("Document", args.id);
      }
      if (isForeignKeyViolation(error)) {
        notFound("Collection", args.collectionId);
      }
      throw error;
    }
  },
};