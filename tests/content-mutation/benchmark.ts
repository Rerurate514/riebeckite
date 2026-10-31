import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  ContentIndexBuilder,
  ContentManager,
  planContentLinkUpdates,
} from "../../packages/core/index.ts";
import {
  FileSystemContentMutation,
  FileSystemContentSource,
} from "../../packages/node/index.ts";

type Sample = {
  readonly median: number;
  readonly min: number;
  readonly max: number;
};

const sizes = (process.env.BENCH_FILES ?? "100,1000")
  .split(",")
  .map(Number)
  .filter((value) => Number.isInteger(value) && value > 1);
const runs = Number(process.env.BENCH_RUNS ?? "3");
assert(sizes.length > 0 && Number.isInteger(runs) && runs > 0);

const sandbox = await fs.mkdtemp(
  path.join(os.tmpdir(), "riebeckite-benchmark-"),
);
const platform = process.platform === "win32" ? "windows" : process.platform;

console.error(`platform=${platform} runs=${runs} sizes=${sizes.join(",")}`);

try {
  const results = [];
  for (const size of sizes) {
    const root = path.join(sandbox, String(size));
    const targetPath = "notes/target.md";
    const movedPath = "moved/target.md";
    const mutation = new FileSystemContentMutation(root);
    const planMetrics: number[] = [];
    const linkMetrics: number[] = [];
    const validateMetrics: number[] = [];
    const applyMetrics: number[] = [];
    const manifestMetrics: number[] = [];
    const recoveryMetrics: number[] = [];

    await createVault(root, size);
    await mutation.plan([{ kind: "move", from: targetPath, to: movedPath }]);

    for (let run = 0; run < runs; run += 1) {
      await createVault(root, size);

      const files = await readMarkdown(root);
      const beforePaths = [...files.keys()];
      const afterPaths = beforePaths.map((file) =>
        file === targetPath ? movedPath : file,
      );
      const beforeIndex = indexOf(beforePaths);
      const afterIndex = indexOf(afterPaths);
      for (let iteration = 0; iteration < 3; iteration += 1) {
        linkMetrics.push(
          measure(() => {
            const result = planContentLinkUpdates({
              files,
              retargets: [{ from: targetPath, to: movedPath }],
              beforeIndex,
              afterIndex,
            });
            assert.equal(result.conflicts.length, 0);
            assert.equal(result.updates.size, size - 1);
          }),
        );
      }

      const planned = await timed(() =>
        mutation.plan([{ kind: "move", from: targetPath, to: movedPath }]),
      );
      assert.equal(planned.value.conflicts.length, 0);
      planMetrics.push(planned.ms);

      const planPath = await mutation.savePlan(planned.value);
      const stored = await mutation.loadPlan(planPath);
      const original = await fs.readFile(path.join(root, "notes", "note-0.md"));
      await fs.writeFile(
        path.join(root, "notes", "note-0.md"),
        `${original.toString("utf8")}tampered\n`,
      );
      const validation = await timed(() => mutation.apply(stored));
      assert.equal(validation.value.applied, false);
      assert.equal(
        validation.value.conflicts[0]?.code,
        "concurrent-modification",
      );
      await fs.writeFile(path.join(root, "notes", "note-0.md"), original);
      validateMetrics.push(validation.ms);

      const applied = await timed(() => mutation.apply(stored));
      assert.equal(applied.value.applied, true);
      applyMetrics.push(applied.ms);

      const manifest = await timed(async () => {
        const manager = new ContentManager(new FileSystemContentSource(root));
        return await manager.getManifest();
      });
      assert.equal(manifest.value.entries.length, size);
      manifestMetrics.push(manifest.ms);
    }

    for (let run = 0; run < runs; run += 1) {
      await createVault(root, size);
      const plan = await mutation.plan([
        { kind: "move", from: targetPath, to: movedPath },
      ]);
      assert.equal(plan.conflicts.length, 0);
      const journalPath = path.join(
        root,
        ".riebeckite",
        "mutations",
        plan.id,
        "journal.json",
      );
      let writes = 0;
      const interrupted = new FileSystemContentMutation(root, {
        beforeWrite: () => {
          if (writes === Math.max(1, Math.floor(size / 2)))
            throw new Error("benchmark interruption");
          writes += 1;
        },
      });
      await assert.rejects(interrupted.apply(plan));
      const recovered = await timed(() => mutation.recover(journalPath));
      assert.equal(recovered.value.recovered, true);
      assert.equal(recovered.value.conflicts.length, 0);
      assert.equal(
        recovered.value.restoredPaths.length,
        Math.max(1, Math.floor(size / 2)),
      );
      recoveryMetrics.push(recovered.ms);
    }

    results.push({
      platform,
      files: size,
      runs,
      metrics: {
        plan: summary(planMetrics),
        linkImpact: summary(linkMetrics),
        validate: summary(validateMetrics),
        apply: summary(applyMetrics),
        futureManifest: summary(manifestMetrics),
        recovery: summary(recoveryMetrics),
      },
    });
    console.error(`${size} files complete`);
  }
  console.log(JSON.stringify(results, null, 2));
} finally {
  await fs.rm(sandbox, { recursive: true, force: true });
}

async function createVault(root: string, size: number): Promise<void> {
  await fs.rm(root, { recursive: true, force: true });
  await fs.mkdir(path.join(root, "notes"), { recursive: true });
  await fs.writeFile(
    path.join(root, "notes", "target.md"),
    "---\ntitle: Target\npublish: true\n---\n\n# Target\n",
  );
  await Promise.all(
    Array.from({ length: size - 1 }, async (_, index) => {
      await fs.writeFile(
        path.join(root, "notes", `note-${index}.md`),
        `---\ntitle: Note ${index}\npublish: true\n---\n\n# Note ${index}\n\n[[notes/target]] [target](target.md)\n`,
      );
    }),
  );
}

async function readMarkdown(root: string): Promise<Map<string, string>> {
  const files = new Map<string, string>();
  for (const entry of await fs.readdir(path.join(root, "notes"))) {
    if (!entry.endsWith(".md")) continue;
    const relative = `notes/${entry}`;
    files.set(relative, await fs.readFile(path.join(root, relative), "utf8"));
  }
  return files;
}

function indexOf(paths: readonly string[]): ReadonlyMap<string, string> {
  const entries = paths.map((file) => ({ path: file }));
  return ContentIndexBuilder.buildFromAliases(entries, new Map()).index;
}

async function timed<T>(
  action: () => Promise<T>,
): Promise<{ readonly ms: number; readonly value: T }> {
  const start = process.hrtime.bigint();
  const value = await action();
  return { ms: Number(process.hrtime.bigint() - start) / 1_000_000, value };
}

function measure(action: () => void): number {
  const start = process.hrtime.bigint();
  action();
  return Number(process.hrtime.bigint() - start) / 1_000_000;
}

function summary(values: readonly number[]): Sample {
  assert(values.length > 0);
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2
      : (sorted[middle] as number);
  return {
    median: round(median),
    min: round(sorted[0] as number),
    max: round(sorted.at(-1) as number),
  };
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
