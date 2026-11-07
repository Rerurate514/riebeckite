import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { runChaos } from "./chaos.mjs";
import { generateVault } from "./lib/vault.mjs";

test("chaos vault generation is seeded and includes adversarial content", async (t) => {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-chaos-generator-"),
  );
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const first = path.join(root, "first");
  const second = path.join(root, "second");
  await generateVault(first, { size: 10, profile: "chaos", seed: 7 });
  await generateVault(second, { size: 10, profile: "chaos", seed: 7 });
  assert.deepEqual(await snapshot(first), await snapshot(second));
  const names = await snapshot(first);
  assert.ok(names.some((name) => name.includes("日本語")));
  assert.ok(names.some((name) => name.startsWith("views/Matrix.base:")));
});

test("chaos harness keeps incremental output equivalent to a cold build", async () => {
  const result = await runChaos({ size: 20, seed: 7 });
  assert.equal(result.baselineEntries, 22);
  assert.ok(result.rows.every((row) => row.equivalent));
  assert.deepEqual(
    result.rows.map((row) => row.scenario),
    ["warm", "single-edit", "add", "delete", "move", "corrupt-cache"],
  );
});

async function snapshot(directory) {
  const entries = await fs.readdir(directory, {
    recursive: true,
    withFileTypes: true,
  });
  return (
    await Promise.all(
      entries
        .filter((entry) => entry.isFile())
        .map(async (entry) => {
          const file = path.join(entry.parentPath, entry.name);
          return `${path.relative(directory, file).split(path.sep).join("/")}:${await fs.readFile(file, "utf8")}`;
        }),
    )
  ).sort();
}
