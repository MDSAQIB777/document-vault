import { GraphQLError } from "graphql";

/**
 * Central place for the "reject bad input with a real GraphQL error"
 * requirement in the assignment. Each helper throws with an
 * `extensions.code` so clients can branch on error type instead of
 * string-matching messages.
 */

export function badUserInput(message: string): never {
  throw new GraphQLError(message, {
    extensions: { code: "BAD_USER_INPUT" },
  });
}

export function notFound(entity: string, id: string): never {
  throw new GraphQLError(`${entity} with id "${id}" was not found`, {
    extensions: { code: "NOT_FOUND" },
  });
}

/**
 * Prisma throws a generic PrismaClientKnownRequestError for constraint
 * violations. P2003 is a foreign key violation — e.g. createDocument
 * pointing at a collectionId that doesn't exist. We check the error's
 * `code` property (rather than importing Prisma's error class, which
 * keeps this file framework-agnostic) and turn it into a clean
 * GraphQLError instead of a raw 500.
 */
export function isForeignKeyViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2003"
  );
}

/**
 * P2025 is Prisma's "record to update/delete does not exist" error —
 * thrown by update()/delete() when the where clause matches nothing.
 */
export function isRecordNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2025"
  );
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function assertNonEmpty(value: string, field: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    badUserInput(`${field} must not be empty`);
  }
  return trimmed;
}

export function assertValidSlug(slug: string): string {
  const trimmed = slug.trim();
  if (!SLUG_PATTERN.test(trimmed)) {
    badUserInput(
      `slug "${slug}" is malformed — use lowercase letters, numbers, and hyphens only (e.g. "my-collection")`
    );
  }
  return trimmed;
}