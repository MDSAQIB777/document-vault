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

```
prisma/schema.prisma      # Collection + Document models
src/schema.graphql        # GraphQL SDL (schema-first)
src/resolvers/            # Query, Mutation, and nested-field resolvers
src/context.ts            # Per-request GraphQL context (exposes prisma)
src/errors.ts             # Validation helpers + typed GraphQLError throwers
src/db.ts                 # Prisma client singleton
src/index.ts              # Yoga server entrypoint
src/__tests__/            # Unit tests (errors.test.ts) +
                           # integration test against Dockerized Postgres
```

## Status

This is a scaffold: server boots, schema is complete, and
`createCollection` / `Query.collections` are fully implemented as a
reference pattern. The remaining resolvers in `Query.ts` and
`Mutation.ts` are marked `TODO` with implementation notes inline.

## How I'd extend this

If this grew beyond the assignment scope, I'd add:

- **Auth & RBAC** — every mutation is currently unauthenticated by design
  (explicitly out of scope). I'd add a JWT-based context that resolves
  the current user, then scope collections/documents to their owner or
  team.
- **Backward pagination** — `documents` currently only supports
  forward paging (`take` + `cursor` + `hasNextPage`/`endCursor`). Adding
  `last`/`before` with `hasPreviousPage`/`startCursor` would make it
  fully Relay-spec-compliant.
- **Caching hot reads** — `collections` and `collection(id)` are simple
  reads that rarely change; a short-TTL Redis cache in front of them
  would cut DB load without much complexity, once there's real traffic
  to justify it.
- **Full-text search** — the current `search` argument does a simple
  `contains`/`insensitive` substring match. Postgres's built-in
  `tsvector`/`tsquery` (or an external index like Meilisearch) would
  scale better and support ranking/relevance as the document count
  grows.
