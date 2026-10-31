import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  createContentMigrationRegistry,
  defineContentMigration,
} from "@riebeckite/core";
import { FileSystemContentMigration } from "../index.js";

async function fixture(
  definitions: Parameters<typeof createContentMigrationRegistry>[0],
) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "riebeckite-state-"));
  await fs.writeFile(
    path.join(root, "post.md"),
    "---\nid: post\ntitle: Post\ncategory: programming\npublished: true\n---\nSECRET BODY\n",
  );
  return {
    root,
    registry: createContentMigrationRegistry(definitions),
    migration: new FileSystemContentMigration({
      contentDirectory: root,
      registry: createContentMigrationRegistry(definitions),
    }),
  };
}

const legacy = defineContentMigration({
  id: "legacy",
  version: 1,
  description: "Convert legacy fields.",
  rules: [
    { kind: "frontmatter-map", key: "category", map: (value) => [value] },
    { kind: "frontmatter-rename", from: "category", to: "tags" },
    {
      kind: "frontmatter-set",
      key: "visibility",
      value: "public",
      when: (content) => content.frontmatter.published === true,
    },
    { kind: "frontmatter-remove", key: "published" },
  ],
});

test("applies once, records state and history, and skips duplicates", async () => {
  const { root, migration } = await fixture([legacy]);
  try {
    const plan = await migration.plan();
    const result = await migration.apply({
      planPath: await migration.savePlan(plan),
    });
    assert.equal(result.applied, true);
    assert.ok(result.journalPath);
    assert.match(
      await fs.readFile(path.join(root, "post.md"), "utf8"),
      /tags:/,
    );

    const state = await migration.status();
    assert.equal(state.entries[0]?.status, "applied");
    assert.equal(state.entries[0]?.definitionMatches, true);
    assert.equal(state.historyCount, 1);
    const history = await migration.history();
    assert.equal(history.runs[0]?.status, "success");
    assert.equal(history.runs[0]?.changedCount, 1);
    const historyText = await fs.readFile(
      path.join(root, ".riebeckite", "migrations", "history.json"),
      "utf8",
    );
    const stateText = await fs.readFile(
      path.join(root, ".riebeckite", "migrations", "state.json"),
      "utf8",
    );
    assert.equal(historyText.includes(root), false);
    assert.equal(stateText.includes(root), false);
    assert.equal(historyText.includes("SECRET BODY"), false);

    const duplicate = await migration.apply();
    assert.equal(duplicate.applied, false);
    assert.equal(duplicate.skipped, true);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("rejects a stale saved plan without writing", async () => {
  const { root, migration } = await fixture([legacy]);
  try {
    const saved = await migration.savePlan(await migration.plan());
    await fs.writeFile(
      path.join(root, "post.md"),
      "---\nid: post\ntitle: Changed\n---\nBody\n",
    );
    const result = await migration.apply({ planPath: saved });
    assert.equal(result.applied, false);
    assert.ok(
      result.conflicts.some((conflict) => conflict.code === "stale-plan"),
    );
    assert.match(
      await fs.readFile(path.join(root, "post.md"), "utf8"),
      /title: Changed/,
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("supersedes older versions and rejects definition changes", async () => {
  const { root, migration } = await fixture([legacy]);
  try {
    await migration.apply();
    const changed = new FileSystemContentMigration({
      contentDirectory: root,
      registry: createContentMigrationRegistry([
        {
          ...legacy,
          rules: [{ kind: "frontmatter-set", key: "title", value: "Other" }],
        },
      ]),
    });
    const conflict = await changed.apply();
    assert.equal(conflict.applied, false);
    assert.ok(
      conflict.conflicts.some(
        (entry) => entry.code === "migration-definition-changed",
      ),
    );

    const upgraded = new FileSystemContentMigration({
      contentDirectory: root,
      registry: createContentMigrationRegistry([
        { ...legacy, version: 2 },
        {
          id: "upgrade",
          version: 1,
          description: "Upgrade the title.",
          rules: [{ kind: "frontmatter-set", key: "title", value: "Upgraded" }],
        },
      ]),
    });
    const result = await upgraded.apply();
    assert.equal(result.applied, true);
    const status = await upgraded.status();
    const legacyRecord = status.entries.find((entry) => entry.id === "legacy");
    assert.equal(legacyRecord?.status, "superseded");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("rolls back a completed batch and treats a rerun as skipped", async () => {
  const first = defineContentMigration({
    id: "tags",
    version: 1,
    description: "Add tags.",
    rules: [{ kind: "frontmatter-set", key: "tags", value: ["one"] }],
  });
  const second = defineContentMigration({
    id: "title",
    version: 1,
    description: "Change title.",
    dependsOn: ["tags"],
    rules: [{ kind: "frontmatter-set", key: "title", value: "Changed" }],
  });
  const { root, migration } = await fixture([first, second]);
  try {
    const original = await fs.readFile(path.join(root, "post.md"), "utf8");
    const result = await migration.apply();
    assert.equal(result.applied, true);
    assert.equal((await migration.status()).entries.length, 2);

    const rollback = await migration.rollback({ planId: result.plan.id });
    assert.equal(rollback.rolledBack, true);
    assert.equal(
      await fs.readFile(path.join(root, "post.md"), "utf8"),
      original,
    );
    const status = await migration.status();
    assert.ok(status.entries.every((entry) => entry.status === "rolled-back"));
    const history = await migration.history();
    assert.ok(history.runs.some((run) => run.status === "rolled-back"));

    const again = await migration.rollback({ planId: result.plan.id });
    assert.equal(again.skipped, true);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("refuses rollback after external edits and preserves the edit", async () => {
  const { root, migration } = await fixture([legacy]);
  try {
    const result = await migration.apply();
    const edited = "---\nid: post\ntitle: Edited\n---\nEdited body\n";
    await fs.writeFile(path.join(root, "post.md"), edited);
    const rollback = await migration.rollback({ planId: result.plan.id });
    assert.equal(rollback.rolledBack, false);
    assert.ok(
      rollback.conflicts.some((entry) => entry.code === "rollback-conflict"),
    );
    assert.equal(await fs.readFile(path.join(root, "post.md"), "utf8"), edited);
    const status = await migration.status();
    assert.equal(status.entries[0]?.status, "recovery-required");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("reconciles an interrupted apply from a complete journal", async () => {
  const { root, migration } = await fixture([legacy]);
  try {
    await migration.apply();
    const statePath = path.join(
      root,
      ".riebeckite",
      "migrations",
      "state.json",
    );
    const state = JSON.parse(await fs.readFile(statePath, "utf8"));
    state.migrations[0].status = "applying";
    await fs.writeFile(statePath, JSON.stringify(state));
    const status = await migration.status();
    assert.equal(status.entries[0]?.status, "applied");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("recovers a failed mutation journal to the previous content", async () => {
  const { root, migration } = await fixture([legacy]);
  try {
    const original = await fs.readFile(path.join(root, "post.md"), "utf8");
    const result = await migration.apply();
    const journal = result.journalPath as string;
    const journalValue = JSON.parse(await fs.readFile(journal, "utf8"));
    journalValue.state = "failed";
    await fs.writeFile(journal, JSON.stringify(journalValue));
    const statePath = path.join(
      root,
      ".riebeckite",
      "migrations",
      "state.json",
    );
    const state = JSON.parse(await fs.readFile(statePath, "utf8"));
    state.migrations[0].status = "applying";
    await fs.writeFile(statePath, JSON.stringify(state));

    const recovered = await migration.recover({ journal });
    assert.equal(recovered.recovered, true);
    assert.equal(
      await fs.readFile(path.join(root, "post.md"), "utf8"),
      original,
    );
    const status = await migration.status();
    assert.equal(status.entries[0]?.status, "rolled-back");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("reports journal corruption without touching content", async () => {
  const { root, migration } = await fixture([legacy]);
  try {
    const result = await migration.apply();
    const journal = result.journalPath as string;
    const afterApply = await fs.readFile(path.join(root, "post.md"), "utf8");
    await fs.writeFile(journal, "{");
    const rollback = await migration.rollback({ planId: result.plan.id });
    assert.equal(rollback.rolledBack, false);
    assert.ok(
      rollback.conflicts.some((entry) => entry.code === "rollback-failed"),
    );
    assert.equal(
      await fs.readFile(path.join(root, "post.md"), "utf8"),
      afterApply,
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
test("skips recovery when a failed migration has no journal and can retry apply", async () => {
  const { root, migration } = await fixture([legacy]);
  try {
    const statePath = path.join(
      root,
      ".riebeckite",
      "migrations",
      "state.json",
    );
    await fs.mkdir(path.dirname(statePath), { recursive: true });
    const definition = createContentMigrationRegistry([legacy]).latest(
      "legacy",
    );
    await fs.writeFile(
      statePath,
      JSON.stringify({
        schemaVersion: 1,
        updatedAt: new Date().toISOString(),
        migrations: [
          {
            id: "legacy",
            version: 1,
            definitionFingerprint: definition?.fingerprint,
            status: "failed",
            mutationPlanId: "missing-journal",
            changedPaths: ["post.md"],
            updatedAt: new Date().toISOString(),
          },
        ],
      }),
    );
    const recovered = await migration.recover({ migrationId: "legacy" });
    assert.equal(recovered.skipped, true);
    assert.equal((await migration.status()).entries[0]?.status, "failed");
    const applied = await migration.apply();
    assert.equal(applied.applied, true);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("recovers a stale migration lock from a dead process", async () => {
  const { root, migration } = await fixture([legacy]);
  try {
    const lock = path.join(root, ".riebeckite", "migrations", "lock");
    await fs.mkdir(path.dirname(lock), { recursive: true });
    await fs.writeFile(lock, JSON.stringify({ pid: 99999999, token: "dead" }));
    const applied = await migration.apply();
    assert.equal(applied.applied, true);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("does not mark a complete journal applied after external edits", async () => {
  const { root, migration } = await fixture([legacy]);
  try {
    const result = await migration.apply();
    const journal = result.journalPath as string;
    await fs.writeFile(
      path.join(root, "post.md"),
      "---\nid: post\ntitle: Edited\n---\nEdited\n",
    );
    const statePath = path.join(
      root,
      ".riebeckite",
      "migrations",
      "state.json",
    );
    const state = JSON.parse(await fs.readFile(statePath, "utf8"));
    state.migrations[0].status = "applying";
    await fs.writeFile(statePath, JSON.stringify(state));
    const recovered = await migration.recover({ journal });
    assert.equal(recovered.applied, false);
    assert.ok(
      recovered.conflicts.some(
        (entry) => entry.code === "journal-not-recoverable",
      ),
    );
    assert.equal(
      (await migration.status()).entries[0]?.status,
      "recovery-required",
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
