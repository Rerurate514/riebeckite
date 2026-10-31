import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { parseCommand } from "../src/cli.js";
import { runMigrate } from "../src/commands/migrate.js";

async function capture(action: () => Promise<boolean>): Promise<{
  result: boolean;
  output: string;
}> {
  const lines: string[] = [];
  const log = console.log;
  console.log = (...values: unknown[]) => lines.push(values.join(" "));
  try {
    return { result: await action(), output: lines.join("\n") };
  } finally {
    console.log = log;
  }
}

test("migrate parses and dispatches every documented action", async () => {
  assert.deepEqual(parseCommand(["migrate", "list", "--json"]), {
    name: "migrate",
    arguments: ["list", "--json"],
  });
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "riebeckite-migrate-"));
  try {
    await fs.mkdir(path.join(root, "migrations"), { recursive: true });
    await fs.writeFile(
      path.join(root, "migrations", "index.mjs"),
      `export default [{
        id: "legacy",
        version: 1,
        description: "Convert legacy frontmatter.",
        rules: [
          { kind: "frontmatter-map", key: "category", map: (value) => [value] },
          { kind: "frontmatter-rename", from: "category", to: "tags" },
          { kind: "frontmatter-set", key: "visibility", value: "public", when: (content) => content.frontmatter.published === true },
          { kind: "frontmatter-remove", key: "published" }
        ]
      }];`,
    );
    const original =
      "---\nid: post\ntitle: Post\ncategory: programming\npublished: true\n---\nBody\n";
    await fs.writeFile(path.join(root, "post.md"), original);
    const project = {
      contentRoot: root,
      projectRoot: root,
      invocationCwd: root,
    } as never;

    const list = await capture(() => runMigrate(project, ["list", "--json"]));
    assert.equal(list.result, true);
    assert.equal(JSON.parse(list.output).migrations[0].id, "legacy");

    const dry = await capture(() => runMigrate(project, ["apply", "--json"]));
    assert.equal(dry.result, true);
    assert.equal(
      await fs.readFile(path.join(root, "post.md"), "utf8"),
      original,
    );

    const plan = await capture(() => runMigrate(project, ["plan", "--json"]));
    const planValue = JSON.parse(plan.output);
    assert.equal(plan.result, true);
    assert.ok(planValue.id);
    assert.equal(
      await fs.readFile(path.join(root, "post.md"), "utf8"),
      original,
    );

    const applied = await capture(() =>
      runMigrate(project, ["apply", "--apply", "--json"]),
    );
    const appliedValue = JSON.parse(applied.output);
    assert.equal(applied.result, true);
    assert.equal(appliedValue.applied, true);
    const migrated = await fs.readFile(path.join(root, "post.md"), "utf8");
    assert.match(migrated, /tags:/);
    assert.match(migrated, /visibility: public/);

    const status = await capture(() =>
      runMigrate(project, ["status", "--json"]),
    );
    assert.equal(status.result, true);
    assert.equal(JSON.parse(status.output).entries[0].status, "applied");

    const history = await capture(() =>
      runMigrate(project, ["history", "--json"]),
    );
    assert.equal(JSON.parse(history.output).runs[0].status, "success");

    const rolledBack = await capture(() =>
      runMigrate(project, [
        "rollback",
        appliedValue.plan.id,
        "--apply",
        "--json",
      ]),
    );
    assert.equal(rolledBack.result, true);
    assert.equal(JSON.parse(rolledBack.output).rolledBack, true);
    assert.equal(
      await fs.readFile(path.join(root, "post.md"), "utf8"),
      original,
    );

    const recovered = await capture(() =>
      runMigrate(project, ["recover", "--json"]),
    );
    assert.equal(recovered.result, true);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
