import { Query } from "./Query.ts";
import { Mutation } from "./Mutation.ts";
import { Collection as CollectionFields, Document as DocumentFields } from "./fields.ts";
import { DateTime } from "./scalars.ts";

export const resolvers = {
  DateTime,
  Query,
  Mutation,
  Collection: CollectionFields,
  Document: DocumentFields,
};
