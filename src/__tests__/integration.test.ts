import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { prisma } from "../db.ts";

// Integration test — needs `docker compose up -d` and a migrated database
// (see README). Run with: bun test

describe("Collection -> Document integration", () => {
  beforeAll(async () => {
    // Clean slate so this test is repeatable.
    await prisma.document.deleteMany();
    await prisma.collection.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test("creating a collection then a document links them correctly", async () => {
    const collection = await prisma.collection.create({
      data: { name: "Engineering Docs", slug: "engineering-docs" },
    });

    const document = await prisma.document.create({
      data: {
        title: "Onboarding Guide",
        content: "Welcome to the team.",
        collectionId: collection.id,
        tags: ["onboarding"],
      },
    });

    expect(document.collectionId).toBe(collection.id);

    const withDocs = await prisma.collection.findUniqueOrThrow({
      where: { id: collection.id },
      include: { documents: true },
    });

    expect(withDocs.documents).toHaveLength(1);
    expect(withDocs.documents[0]?.title).toBe("Onboarding Guide");
  });

  // TODO: once Query.documents (search + cursor pagination) is implemented,
  // add a test here that creates several documents and asserts the
  // search/filter/pagination behavior end-to-end.
});
