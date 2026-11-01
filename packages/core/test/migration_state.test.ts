import assert from "node:assert/strict";
import test from "node:test";
import {
  appendContentMigrationHistory,
  type ContentMigrationRecord,
  ContentMigrationStateError,
  createContentMigrationRegistry,
  defineContentMigration,
  emptyContentMigrationHistory,
  emptyContentMigrationState,
  findContentMigrationRecord,
  listContentMigrationEntries,
  parseContentMigrationHistory,
  parseContentMigrationState,
  sanitizeContentMigrationPath,
  sanitizeContentMigrationPaths,
  upsertContentMigrationRecord,
} from "../index.js";

const at = "2026-01-01T00:00:00.000Z";

function record(
  overrides: Partial<ContentMigrationRecord> = {},
): ContentMigrationRecord {
  return {
    id: "legacy",
    version: 1,
    definitionFingerprint: "fingerprint",
    status: "applied",
    planId: "plan",
    planFingerprint: "plan-fingerprint",
    contentFingerprint: "content-fingerprint",
    mutationPlanId: "mutation",
    mutationPlanFingerprint: "mutation-fingerprint",
    journalPath: ".riebeckite/mutations/mutation/journal.json",
    changedPaths: ["post.md"],
    updatedAt: at,
    appliedAt: at,
    ...overrides,
  };
}

test("state round trips and sorts records", () => {
  const state = upsertContentMigrationRecord(
    upsertContentMigrationRecord(
      emptyContentMigrationState(new Date(at)),
      record({ id: "z", version: 2, changedPaths: ["z.md", "a.md", "a.md"] }),
      new Date(at),
    ),
    record({ id: "a", version: 1 }),
    new Date(at),
  );
  const parsed = parseContentMigrationState(JSON.parse(JSON.stringify(state)));
  assert.equal(parsed.migrations[0]?.id, "a");
  assert.deepEqual(parsed.migrations[1]?.changedPaths, ["a.md", "z.md"]);
  assert.equal(findContentMigrationRecord(parsed, "z")?.version, 2);
});

test("state parsing fails closed on unknown statuses and unsafe paths", () => {
  assert.throws(
    () =>
      parseContentMigrationState({
        schemaVersion: 1,
        updatedAt: at,
        migrations: [
          record({ status: "unknown" as ContentMigrationRecord["status"] }),
        ],
      }),
    ContentMigrationStateError,
  );
  assert.throws(
    () => sanitizeContentMigrationPath("../secret.md"),
    ContentMigrationStateError,
  );
  assert.throws(
    () => sanitizeContentMigrationPath("C:/secret.md"),
    ContentMigrationStateError,
  );
  assert.throws(
    () => sanitizeContentMigrationPaths(["/absolute.md"]),
    ContentMigrationStateError,
  );
});

test("history is bounded and rejects corruption", () => {
  let history = emptyContentMigrationHistory(new Date(at));
  for (let index = 0; index < 5; index += 1)
    history = appendContentMigrationHistory(
      history,
      {
        id: "legacy",
        version: index + 1,
        at,
        planId: "plan",
        planFingerprint: "plan-fingerprint",
        contentFingerprint: "content-fingerprint",
        status: "success",
        created: 0,
        updated: 1,
        deleted: 0,
        moved: 0,
        changedCount: 1,
        recoveryState: "none",
      },
      3,
    );
  assert.equal(history.runs.length, 3);
  assert.equal(history.runs[0]?.version, 3);
  assert.throws(
    () =>
      parseContentMigrationHistory({
        schemaVersion: 1,
        updatedAt: at,
        runs: [{ ...history.runs[0], status: "partial" }],
      }),
    ContentMigrationStateError,
  );
});

test("list entries distinguish applied, pending and superseded versions", () => {
  const registry = createContentMigrationRegistry([
    defineContentMigration({
      id: "legacy",
      version: 1,
      description: "Version one.",
    }),
    defineContentMigration({
      id: "legacy",
      version: 2,
      description: "Version two.",
      dependsOn: [],
    }),
    defineContentMigration({
      id: "fresh",
      version: 1,
      description: "Never applied.",
    }),
  ]);
  const state = upsertContentMigrationRecord(
    emptyContentMigrationState(new Date(at)),
    record({
      version: 1,
      definitionFingerprint: registry.versions("legacy")[0]?.fingerprint,
    }),
    new Date(at),
  );
  const entries = listContentMigrationEntries(registry.migrations, state);
  const legacy = entries.find((entry) => entry.id === "legacy");
  assert.equal(legacy?.status, "applied");
  assert.equal(legacy?.appliedVersion, 1);
  assert.deepEqual(legacy?.pendingVersions, [2]);
  const fresh = entries.find((entry) => entry.id === "fresh");
  assert.equal(fresh?.status, "pending");
  assert.deepEqual(fresh?.pendingVersions, [1]);
});
