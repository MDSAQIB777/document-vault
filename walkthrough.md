# Document Vault — Implementation Walkthrough

## What I built

A GraphQL API for organizing documents into collections, built with Bun,
TypeScript (strict mode), GraphQL Yoga, PostgreSQL, and Prisma — per the
assignment spec. All required queries and mutations are implemented,
tested, and manually verified end-to-end.

Repo: https://github.com/MDSAQIB777/document-vault
PR: https://github.com/MDSAQIB777/document-vault/pull/1

## Domain model

Two Prisma models, mirrored directly in the GraphQL schema:

- **Collection** — `id`, `name`, `slug` (unique), `createdAt`, and a
  one-to-many relation to documents.
- **Document** — `id`, `title`, `content`, `tags` (string array),
  `collectionId`, `isArchived`, `createdAt`, with a required relation
  back to its `Collection`.

The GraphQL schema is written schema-first (`src/schema.graphql`), with
a `DocumentConnection` / `PageInfo` shape specifically for the
cursor-paginated `documents` query.

## Search and cursor pagination

The trickiest requirement was `documents(collectionId, search, isArchived,
take, cursor)` with substring search and cursor-based pagination.

**Search** — `search` matches against `title` OR `content`,
case-insensitive, using Prisma's `contains` + `mode: "insensitive"`
inside an `OR` clause. All filters (`collectionId`, `isArchived`,
`search`) are added to the `where` object conditionally — Prisma
ignores `undefined` keys, so omitting a filter argument correctly
means "don't filter on this," not "filter on empty string."

**Pagination** — I used an **opaque base64 cursor** rather than
exposing the raw document `id` directly to the client. The cursor
encodes `{ createdAt, id }` from the last row of the previous page.
Documents are ordered by `(createdAt desc, id desc)` — `id` breaks
ties for documents created in the same instant, since `createdAt`
alone isn't guaranteed unique.

To detect whether there's a next page without a separate `COUNT`
query, I fetch `take + 1` rows; if I get back one more than
requested, I know there's more data, and I trim the extra row before
returning.

**Why opaque over raw-ID cursor:** a raw `cursor: { id }` would also
work (Prisma supports it natively), but an opaque cursor is the more
production-minded / Relay-spec-aligned choice — it doesn't leak
internal IDs to clients and would survive a future change to the sort
order without breaking existing client-held cursors.

## Error handling

The assignment specifically calls for "real GraphQL errors rather than
unhandled 500s" for invalid input. I centralized this in
`src/errors.ts`:

- `badUserInput(message)` — throws a `GraphQLError` with
  `extensions.code: "BAD_USER_INPUT"`, used for empty titles/content
  and malformed slugs (validated against a
  `lowercase-with-hyphens` pattern).
- `notFound(entity, id)` — throws with `extensions.code: "NOT_FOUND"`.
- `isForeignKeyViolation(error)` / `isRecordNotFound(error)` — check
  Prisma's error `code` (`P2003` for FK violations, `P2025` for
  "record to update/delete not found") and let resolvers translate
  those into the clean errors above, instead of letting Prisma's raw
  exception leak to the client as an "Unexpected error" 500.

Example: `createDocument` with a `collectionId` that doesn't exist
hits Postgres's foreign key constraint, which Prisma surfaces as
`P2003`. The resolver catches it and returns a proper
`NOT_FOUND: Collection with id "..." was not found` GraphQL error.

## Nullable vs. error — a deliberate inconsistency

- **`collection(id)`** returns `null` if the ID doesn't match anything
  — the schema explicitly marks `Collection` as nullable here, so I
  honored that rather than throwing.
- **`updateDocument` / `deleteDocument` / `moveDocument`** throw a
  `NOT_FOUND` GraphQLError instead, because there's no nullable
  signal in the schema for these — the mutation return types are
  non-null, so silently returning `null` isn't an option, and an
  explicit error is the correct, spec-consistent choice.

This is intentional, not an oversight — I matched each resolver's
behavior to what its own schema type allows.

## Idempotent delete

`deleteDocument` returns `true` on success and **`false`** (not an
error) if the document is already gone. I treated delete as
idempotent — asking to delete something that's already deleted is a
reasonable, common client scenario (e.g. a retried request), and
returning `false` communicates "nothing left to delete" without
forcing the caller to handle an exception for what isn't really an
exceptional case. The alternative (throwing `NOT_FOUND`) is also
defensible; I chose idempotency because it's the friendlier contract
for a delete operation specifically.

## Testing

- **Unit tests** (`src/__tests__/errors.test.ts`) — cover the
  validation helpers (`assertNonEmpty`, `assertValidSlug`) against
  valid input, empty strings, whitespace-only strings, and malformed
  slugs. No database needed.
- **Integration test** (`src/__tests__/integration.test.ts`) — runs
  against the real Dockerized Postgres instance, confirming a
  collection→document created through Prisma links correctly and
  that the nested `documents` relation resolves as expected.
- `bun run sanity` (lint + typecheck + test) passes clean with zero
  errors.

## Manual verification (via GraphiQL)

All resolvers were exercised end-to-end against the running server:

- `createCollection` / `collections` — create, then list, confirmed
  round-trip.
- `createDocument` — succeeds with a valid `collectionId`; a bogus
  `collectionId` returns a clean `NOT_FOUND` error, not a 500.
- `documents` — search (`search: "api"`), `take`-limited pagination,
  and the resulting `hasNextPage`/`endCursor` all behave correctly.
- `updateDocument` — partial updates (e.g. `isArchived: true` alone)
  only touch the fields passed; `NOT_FOUND` on a missing ID.
- `deleteDocument` — `true` on first delete, `false` on a repeat
  delete of the same ID.
- `moveDocument` — confirmed a document's `collectionId` changes
  correctly after moving it into a different collection.
- `collection(id)` — returns the collection with its nested
  documents for a real ID; returns `null` (not an error) for a
  nonexistent one.

## How I'd extend this

If this grew beyond the assignment's scope, next steps would be:

- **Auth & RBAC** — every mutation is currently unauthenticated by
  design (explicitly out of scope here). I'd add a JWT-based context
  that resolves the current user, then scope collections/documents to
  their owner or team.
- **Backward pagination** — `documents` only supports forward paging
  today (`take`/`cursor`/`hasNextPage`/`endCursor`). Adding
  `last`/`before` with `hasPreviousPage`/`startCursor` would make it
  fully Relay-spec-compliant.
- **Caching hot reads** — `collections` and `collection(id)` are
  simple, rarely-changing reads; a short-TTL cache in front of them
  would reduce database load once there's real traffic.
- **Full-text search** — the current `search` is a simple
  case-insensitive substring match. Postgres's `tsvector`/`tsquery`
  (or an external search index) would scale better and support
  relevance ranking as the document count grows.

## AI usage disclosure

I used AI (Claude) to help scaffold the initial project structure and
pair through implementing each resolver. I made the key design
decisions above myself and can explain the reasoning behind each one,
as demonstrated throughout this document.
