import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { runCli } from "../src/command/runner.js";

async function run(
  root: string,
  argv: readonly string[],
): Promise<{ code: number; stdout: string; stderr: string }> {
  let stdout = "";
  let stderr = "";
  const code = await runCli({
    argv,
    cwd: root,
    version: "0.0.0",
    stdout: (text) => {
      stdout += text;
    },
    stderr: (text) => {
      stderr += text;
    },
  });
  return { code, stdout, stderr };
}

const MIGRATION = `export default [{
  id: "legacy",
  version: 1,
  description: "Convert legacy frontmatter.",
  rules: [
    { kind: "frontmatter-map", key: "category", map: (value) => [value] },
    { kind: "frontmatter-rename", from: "category", to: "tags" },
    { kind: "frontmatter-set", key: "visibility", value: "public", when: (content) => content.frontmatter.published === true },
    { kind: "frontmatter-remove", key: "published" }
  ]
}];`;

const ORIGINAL =
  "---\nid: post\ntitle: Post\ncategory: programming\npublished: true\n---\nBody\n";

async function fixture(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "riebeckite-migrate-"));
  await fs.writeFile(
    path.join(root, "riebeckite.config.ts"),
    'export default { site: { title: "Migrate" } };\n',
  );
  await fs.writeFile(path.join(root, "vite.config.ts"), "export default {};\n");
  await fs.mkdir(path.join(root, "content"), { recursive: true });
  await fs.writeFile(path.join(root, "content", "post.md"), ORIGINAL);
  await fs.mkdir(path.join(root, "migrations"), { recursive: true });
  await fs.writeFile(path.join(root, "migrations", "index.mjs"), MIGRATION);
  return root;
}

test("migrate runs every action through the command registry", async () => {
  const root = await fixture();
  try {
    const list = await run(root, ["migrate", "list", "--json"]);
    assert.equal(list.code, 0, list.stderr);
    assert.equal(JSON.parse(list.stdout).migrations[0].id, "legacy");

    const dry = await run(root, ["migrate", "apply", "--json"]);
    assert.equal(dry.code, 0, dry.stderr);
    assert.equal(
      await fs.readFile(path.join(root, "content", "post.md"), "utf8"),
      ORIGINAL,
    );

    const planPath = path.join(root, "migration-plan.json");
    const plan = await run(root, [
      "migrate",
      "plan",
      "--id",
      "legacy",
      "--out",
      planPath,
      "--json",
    ]);
    assert.equal(plan.code, 0, plan.stderr);
    const planValue = JSON.parse(plan.stdout);
    assert.equal(planValue.plan.migrations[0].id, "legacy");
    assert.ok(planValue.planPath);
    assert.equal(
      await fs.readFile(path.join(root, "content", "post.md"), "utf8"),
      ORIGINAL,
    );

    const applied = await run(root, [
      "migrate",
      "apply",
      "--plan",
      planPath,
      "--apply",
      "--json",
    ]);
    assert.equal(applied.code, 0, applied.stderr);
    const appliedValue = JSON.parse(applied.stdout);
    assert.equal(appliedValue.applied, true);
    const migrated = await fs.readFile(
      path.join(root, "content", "post.md"),
      "utf8",
    );
    assert.match(migrated, /tags:/);
    assert.match(migrated, /visibility: public/);

    const duplicate = await run(root, [
      "migrate",
      "apply",
      "--apply",
      "--json",
    ]);
    assert.equal(duplicate.code, 0, duplicate.stderr);
    assert.equal(JSON.parse(duplicate.stdout).skipped, true);
    assert.equal(
      await fs.readFile(path.join(root, "content", "post.md"), "utf8"),
      migrated,
    );

    const status = await run(root, ["migrate", "status", "--json"]);
    assert.equal(status.code, 0, status.stderr);
    assert.equal(JSON.parse(status.stdout).entries[0].status, "applied");

    const history = await run(root, ["migrate", "history", "--json"]);
    assert.equal(history.code, 0, history.stderr);
    assert.equal(JSON.parse(history.stdout).runs[0].status, "success");

    const appliedPlanId = JSON.parse(status.stdout).entries[0].planId;
    const rollbackDry = await run(root, ["migrate", "rollback", appliedPlanId]);
    assert.equal(rollbackDry.code, 0, rollbackDry.stderr);
    assert.match(rollbackDry.stdout, /Re-run with --apply/);
    assert.equal(
      await fs.readFile(path.join(root, "content", "post.md"), "utf8"),
      migrated,
    );

    const rolledBack = await run(root, [
      "migrate",
      "rollback",
      appliedPlanId,
      "--apply",
      "--json",
    ]);
    assert.equal(rolledBack.code, 0, rolledBack.stderr);
    assert.equal(JSON.parse(rolledBack.stdout).rolledBack, true);
    assert.equal(
      await fs.readFile(path.join(root, "content", "post.md"), "utf8"),
      ORIGINAL,
    );

    const recovered = await run(root, [
      "migrate",
      "recover",
      "--apply",
      "--json",
    ]);
    assert.equal(recovered.code, 0, recovered.stderr);
    assert.equal(JSON.parse(recovered.stdout).conflicts.length, 0);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("migrate help and completion list every action", async () => {
  const root = await fixture();
  try {
    const help = await run(root, ["help", "migrate"]);
    assert.equal(help.code, 0, help.stderr);
    for (const action of [
      "list",
      "plan",
      "apply",
      "status",
      "history",
      "rollback",
      "recover",
    ])
      assert.match(help.stdout, new RegExp(`^  ${action}\\s`, "m"));

    const completion = await run(root, ["completion", "bash"]);
    assert.equal(completion.code, 0, completion.stderr);
    assert.match(completion.stdout, /migrate/);
    assert.match(completion.stdout, /migrate apply/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
