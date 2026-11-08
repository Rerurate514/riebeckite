import assert from "node:assert/strict";
import { test } from "node:test";
import { D1ReactionsStorage, d1Storage } from "../index.ts";
import type { D1Database, D1PreparedStatement } from "../index.ts";

function createFakeD1(): D1Database & { calls: string[] } {
  const calls: string[] = [];
  const db: D1Database & { calls: string[] } = {
    calls,
    prepare(query: string): D1PreparedStatement {
      calls.push(query);
      return {
        bind() {
          return this;
        },
        async first() {
          return null;
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

test("d1Storage returns a D1ReactionsStorage with read/write capabilities", () => {
  const db = createFakeD1();
  const storage = d1Storage(db);
  assert.ok(storage instanceof D1ReactionsStorage);
  assert.ok(storage.capabilities.has("read"));
  assert.ok(storage.capabilities.has("write"));
});

test("getReactions returns zero counts when no rows", async () => {
  const db = createFakeD1();
  const storage = d1Storage(db);
  const page = await storage.getReactions("page-1");
  assert.equal(page.contentId, "page-1");
  assert.equal(page.counts.length, 5);
  for (const count of page.counts) {
    assert.equal(count.count, 0);
    assert.equal(count.reacted, false);
  }
});

test("addReaction runs an INSERT and re-reads", async () => {
  const db = createFakeD1();
  const storage = d1Storage(db);
  await storage.addReaction("page-1", "like");
  assert.ok(db.calls.some((q) => q.includes("INSERT OR IGNORE")));
});
