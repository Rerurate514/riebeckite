import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  createContentMigrationRegistry,
  defineContentMigration,
  planContentMigrationBatch,
} from "@riebeckite/core";
import { FileSystemContentMigration } from "../index.js";

const TRIALS = 3;

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)] as number;
}

async function measure(
  action: () => Promise<unknown>,
  trials = TRIALS,
): Promise<{ median: number; min: number; max: number }> {
  const times: number[] = [];
  for (let index = 0; index < trials; index += 1) {
    const started = performance.now();
    await action();
    times.push(performance.now() - started);
  }
  return {
    median: median(times),
    min: Math.min(...times),
    max: Math.max(...times),
  };
}

function definition() {
  return defineContentMigration({
    id: "legacy",
    version: 1,
    description: "Normalize legacy frontmatter.",
    rules: [
      { kind: "frontmatter-map", key: "category", map: (value) => [value] },
      { kind: "frontmatter-rename", from: "category", to: "tags" },
      {
        kind: "frontmatter-set",
        key: "visibility",
        value: "public",
        when: (content) =>
          (content.frontmatter as { published?: unknown }).published === true &&
          content.frontmatter.visibility === undefined,
      },
      { kind: "frontmatter-remove", key: "published" },
    ],
  });
}

async function run(filesCount: number): Promise<void> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "riebeckite-perf-"));
  try {
    for (let index = 0; index < filesCount; index += 1) {
      await fs.writeFile(
        path.join(root, `note-${String(index).padStart(4, "0")}.md`),
        `---\nid: note-${index}\ntitle: Note ${index}\ncategory: programming\npublished: true\n---\nBody ${index}\n`,
      );
    }
    const definitions = [definition()];
    const registryTiming = await measure(async () => {
      createContentMigrationRegistry(definitions);
    });
    const registry = createContentMigrationRegistry(definitions);
    const migration = new FileSystemContentMigration({
      contentDirectory: root,
      registry,
    });
    const files = await Promise.all(
      (await fs.readdir(root))
        .filter((file) => file.endsWith(".md"))
        .map(async (file) => ({
          path: file,
          content: await fs.readFile(path.join(root, file), "utf8"),
        })),
    );
    const transformTiming = await measure(async () => {
      planContentMigrationBatch({
        migrations: registry.order,
        files,
        preserveMovedPermalinks: false,
      });
    });
    const planTiming = await measure(() => migration.plan());
    const beforeApply = process.memoryUsage().rss;
    const applyStarted = performance.now();
    const applied = await migration.apply();
    const applyTime = performance.now() - applyStarted;
    const afterApply = process.memoryUsage().rss;
    assert.equal(applied.applied, true);
    const historyTiming = await measure(() => migration.history(), 1);
    const statePath = path.join(
      root,
      ".riebeckite",
      "migrations",
      "state.json",
    );
    const state = JSON.parse(await fs.readFile(statePath, "utf8"));
    state.migrations[0].status = "applying";
    await fs.writeFile(statePath, JSON.stringify(state));
    const resumeTiming = await measure(() => migration.status(), 1);
    const rollbackStarted = performance.now();
    const rolledBack = await migration.rollback({ planId: applied.plan.id });
    const rollbackTime = performance.now() - rollbackStarted;
    assert.equal(rolledBack.rolledBack, true);

    console.log(
      JSON.stringify(
        {
          files: filesCount,
          registry: registryTiming,
          transform: transformTiming,
          plan: planTiming,
          apply: { median: applyTime, min: applyTime, max: applyTime },
          history: historyTiming,
          resume: resumeTiming,
          rollback: {
            median: rollbackTime,
            min: rollbackTime,
            max: rollbackTime,
          },
          rssDeltaMb:
            Math.round(((afterApply - beforeApply) / 1024 / 1024) * 10) / 10,
        },
        null,
        2,
      ),
    );
    assert.ok(planTiming.median < 120_000);
    assert.ok(applyTime < 120_000);
    assert.ok(rollbackTime < 120_000);
    assert.ok(afterApply - beforeApply < 1_500 * 1024 * 1024);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

test("measures plans, applies, history and rollback for 100 files", async () => {
  await run(100);
});

test("measures plans, applies, history and rollback for 1000 files", async () => {
  await run(1_000);
});
