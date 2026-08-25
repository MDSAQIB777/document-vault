import { createSchema, createYoga } from "graphql-yoga";
import { readFileSync } from "node:fs";
import { createContext } from "./context.ts";
import { resolvers } from "./resolvers/index.ts";

const typeDefs = readFileSync(
  new URL("./schema.graphql", import.meta.url),
  "utf-8"
);

const schema = createSchema({
  typeDefs,
  resolvers,
});

const yoga = createYoga({
  schema,
  context: createContext,
  graphqlEndpoint: "/graphql",
});

const port = Number(process.env.PORT ?? 4000);

Bun.serve({
  port,
  fetch: yoga.fetch,
});

console.log(`🔒 Document Vault GraphQL API ready at http://localhost:${port}/graphql`);
