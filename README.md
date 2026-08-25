# Document Vault

A GraphQL API for organizing documents into collections. Built with Bun,
TypeScript, GraphQL Yoga, PostgreSQL, and Prisma.

## Setup

```bash
cp .env.example .env
docker compose up -d && bun install && bun run gendb && bun run dev
```

Then run the initial migration once, from a separate terminal:

```bash
bun run migrate
```

The API is served at `http://localhost:4000/graphql`.

## Scripts

| Command            | What it does                                     |
| ------------------ | ------------------------------------------------- |
| `bun run dev`       | Start the server with hot reload                  |
| `bun run migrate`   | Create/apply a Prisma migration (`migrate dev`)   |
| `bun run gendb`     | Regenerate the Prisma client after a schema change |
| `bun run typecheck` | `tsc --noEmit`                                    |
| `bun run lint`      | ESLint over `src/`                                |
| `bun test`          | Unit + integration tests                          |
| `bun run sanity`    | lint + typecheck + test in one command            |

## Project structure


## Status

All required resolvers are implemented: `createCollection`, `collections`,
`collection(id)` (with nested documents, returns `null` if not found),
`documents` (search + filters + cursor pagination), `createDocument`,
`updateDocument` (partial updates), `deleteDocument` (idempotent —
returns `false` rather than erroring on a repeat delete), and
`moveDocument`. `bun run sanity` (lint + typecheck + test) passes clean.

## Manual verification

All resolvers were exercised end-to-end via the GraphiQL playground
against the Dockerized Postgres instance:

- `createCollection` / `collections` — create + list round-trip confirmed
- `createDocument` — succeeds with a valid `collectionId`; returns a
  clean `NOT_FOUND` error (not a 500) for a bogus one
- `documents` — search, filters, and cursor pagination (`take` +
  `cursor` + `hasNextPage`/`endCursor`) all confirmed working
- `updateDocument` — partial updates confirmed; `NOT_FOUND` on a
  missing id
- `deleteDocument` — returns `true` on success, `false` (not an error)
  on a repeat delete of an already-removed document
- `moveDocument` — confirmed moving a document between collections
- `collection(id)` — returns the collection with nested documents;
  returns `null` (not an error) for a non-existent id, per the
  schema's nullability

## How I'd extend this

If this grew beyond the assignment scope, I'd add:

- **Auth & RBAC** — every mutation is currently unauthenticated by design
  (explicitly out of scope for this assignment). I'd add a JWT-based
  context that resolves the current user, then scope collections and
  documents to their owner or team.
- **Backward pagination** — `documents` currently only supports forward
  paging (`take` + `cursor` + `hasNextPage`/`endCursor`). Adding
  `last`/`before` with `hasPreviousPage`/`startCursor` would make it
  fully Relay-spec-compliant.
- **Caching hot reads** — `collections` and `collection(id)` are simple
  reads that rarely change; a short-TTL cache in front of them would
  cut database load once there's real traffic to justify it.
- **Full-text search** — the current `search` argument does a simple
  case-insensitive substring match. Postgres's `tsvector`/`tsquery`
  (or an external index) would scale better and support relevance
  ranking as the document count grows.
