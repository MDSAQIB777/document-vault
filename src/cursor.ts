/**
 * Opaque cursor helpers for keyset pagination on Document.
 *
 * We sort documents by (createdAt desc, id desc) — createdAt alone isn't
 * unique enough (two documents can share a timestamp), so id breaks ties
 * deterministically. The cursor encodes both so we know exactly where to
 * resume from, without exposing raw DB internals to the client.
 */

type DocumentCursor = {
  createdAt: string; // ISO string
  id: string;
};

export function encodeCursor(doc: { createdAt: Date; id: string }): string {
  const payload: DocumentCursor = {
    createdAt: doc.createdAt.toISOString(),
    id: doc.id,
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

export function decodeCursor(cursor: string): DocumentCursor {
  try {
    const json = Buffer.from(cursor, "base64").toString("utf-8");
    const parsed = JSON.parse(json) as DocumentCursor;
    if (!parsed.createdAt || !parsed.id) {
      throw new Error("missing fields");
    }
    return parsed;
  } catch {
    throw new Error(`Invalid cursor: "${cursor}"`);
  }
}