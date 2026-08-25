import { describe, expect, test } from "bun:test";
import { assertNonEmpty, assertValidSlug } from "../errors.ts";

describe("assertNonEmpty", () => {
  test("returns the trimmed value for non-empty input", () => {
    expect(assertNonEmpty("  hello  ", "title")).toBe("hello");
  });

  test("throws on an empty string", () => {
    expect(() => assertNonEmpty("", "title")).toThrow(/must not be empty/);
  });

  test("throws on a whitespace-only string", () => {
    expect(() => assertNonEmpty("   ", "title")).toThrow(/must not be empty/);
  });
});

describe("assertValidSlug", () => {
  test("accepts a well-formed slug", () => {
    expect(assertValidSlug("my-collection-1")).toBe("my-collection-1");
  });

  test("rejects uppercase letters", () => {
    expect(() => assertValidSlug("My-Collection")).toThrow(/malformed/);
  });

  test("rejects spaces", () => {
    expect(() => assertValidSlug("my collection")).toThrow(/malformed/);
  });

  test("rejects leading/trailing hyphens", () => {
    expect(() => assertValidSlug("-my-collection-")).toThrow(/malformed/);
  });
});

// TODO: add resolver-level unit tests once createDocument / updateDocument /
// moveDocument are implemented — mock ctx.prisma (e.g. with a simple stub
// object) so these stay fast and don't touch the real database.
