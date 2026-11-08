import assert from "node:assert/strict";
import { test } from "node:test";
import { D1CommentsStorage, d1Storage } from "../index.ts";
import type { D1Database, D1PreparedStatement } from "../index.ts";

function createFakeD1(): D1Database {
  const db: D1Database = {
    prepare(): D1PreparedStatement {
      return {
        bind() {
          return this;
        },
        async first() {
          return { total: 0 };
        },
        async all() {
          return { results: [] };
        },
        async run() {
          return { success: true };
        },
      };
    },
  };
  return db;
}

test("d1Storage returns a D1CommentsStorage with read capability", () => {
  const storage = d1Storage(createFakeD1());
  assert.ok(storage instanceof D1CommentsStorage);
  assert.ok(storage.capabilities.has("read"));
});

test("getComments returns empty page for unknown content", async () => {
  const storage = d1Storage(createFakeD1());
  const page = await storage.getComments("unknown");
  assert.equal(page.comments.length, 0);
  assert.equal(page.total, 0);
});
