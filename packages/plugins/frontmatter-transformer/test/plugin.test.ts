import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  type CliArgumentValue,
  type CliCommandContext,
  type CliCommandDefinition,
  type CliCommandInput,
  type CliOptionValue,
  createCliCommandRegistry,
  resolveConfig,
} from "@riebeckite/core";
import { frontmatterTransformer } from "../index.ts";
import { FRONTMATTER_PRESETS } from "../src/presets.ts";

const ORIGINAL =
  "---\ntitle: '  Post  '\ntags: 'one, two one'\ndescription: ''\n---\nBody\n";

async function fixture(): Promise<string> {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-frontmatter-"),
  );
  const contentRoot = path.join(root, "content");
  await fs.mkdir(contentRoot, { recursive: true });
  await fs.writeFile(path.join(contentRoot, "post.md"), ORIGINAL);
  return root;
}

function context(root: string): CliCommandContext {
  const config = resolveConfig({ site: { title: "Test" } });
  const project = {
    invocationCwd: root,
    projectRoot: root,
    configRoot: root,
    configPath: path.join(root, "riebeckite.config.ts"),
    appRoot: root,
    contentRoot: path.join(root, "content"),
    config,
  };
  return {
    cwd: root,
    projectRoot: root,
    project,
    config,
    logger: { debug() {}, info() {}, warn() {}, error() {} },
    output: {
      write() {},
      writeLine() {},
      error() {},
      json() {},
    },
    diagnostics: { report() {}, diagnostics: [] },
    signal: new AbortController().signal,
    env: {},
    json: true,
    registry: createCliCommandRegistry(),
    async loadProject() {
      return project;
    },
    onCleanup() {},
  };
}

function command(id: string): CliCommandDefinition {
  const found = frontmatterTransformer().cli?.commands.find(
    (entry) => entry.id === id,
  );
  assert.ok(found);
  return found;
}

function input(
  definition: CliCommandDefinition,
  options: Record<string, CliOptionValue | undefined> = {},
  args: Record<string, CliArgumentValue | undefined> = {},
): CliCommandInput {
  return {
    command: definition,
    arguments: args,
    options,
    rawArguments: [],
  };
}

test("registers presets in one CLI namespace", () => {
  const plugin = frontmatterTransformer();
  assert.equal(plugin.cli?.namespace, "frontmatter");
  assert.deepEqual(plugin.cli?.commands.map((entry) => entry.id).sort(), [
    "apply",
    "history",
    "plan",
    "presets",
    "rollback",
  ]);
  assert.deepEqual(
    FRONTMATTER_PRESETS.map((preset) => preset.id),
    ["normalize-tags", "trim-text", "remove-empty-fields"],
  );
});

test("plans, applies, records history, and rolls back a preset", async () => {
  const root = await fixture();
  try {
    const ctx = context(root);
    const planCommand = command("plan");
    const plan = await planCommand.handler(
      ctx,
      input(planCommand, {
        preset: ["normalize-tags", "trim-text"],
        json: true,
      }),
    );
    assert.equal(readExitCode(plan), 0);
    assert.match(
      await fs.readFile(path.join(root, "content", "post.md"), "utf8"),
      /title: ' {2}Post {2}'/,
    );
    const planValue = readJson(plan) as { id: string; changes: unknown[] };
    assert.equal(planValue.changes.length, 1);

    const applyCommand = command("apply");
    const applied = await applyCommand.handler(
      ctx,
      input(applyCommand, {
        preset: ["normalize-tags", "trim-text"],
        apply: true,
        json: true,
      }),
    );
    assert.equal(readExitCode(applied), 0);
    const appliedValue = readJson(applied) as {
      applied: boolean;
      plan: { id: string };
    };
    assert.equal(appliedValue.applied, true);
    const transformed = await fs.readFile(
      path.join(root, "content", "post.md"),
      "utf8",
    );
    assert.match(transformed, /title: 'Post'/);
    assert.match(transformed, /- one/);
    assert.match(transformed, /- two/);

    const historyCommand = command("history");
    const history = await historyCommand.handler(
      ctx,
      input(historyCommand, { json: true }),
    );
    const historyValue = readJson(history) as {
      runs: { status: string; planId: string }[];
    };
    assert.equal(historyValue.runs[0]?.status, "success");

    const rollbackCommand = command("rollback");
    const rolledBack = await rollbackCommand.handler(
      ctx,
      input(
        rollbackCommand,
        { apply: true, json: true },
        { target: appliedValue.plan.id },
      ),
    );
    assert.equal(readExitCode(rolledBack), 0);
    assert.equal(
      await fs.readFile(path.join(root, "content", "post.md"), "utf8"),
      ORIGINAL,
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("rejects unknown and missing presets", async () => {
  const root = await fixture();
  try {
    const ctx = context(root);
    const applyCommand = command("apply");
    await assert.rejects(async () => {
      await applyCommand.handler(
        ctx,
        input(applyCommand, { preset: ["unknown"], apply: true }),
      );
    }, /Unknown frontmatter preset/);

    const planCommand = command("plan");
    assert.equal(
      planCommand.validate?.(input(planCommand, {})),
      "Pass at least one --preset.",
    );

    const applyWithoutPreset = applyCommand.validate?.(input(applyCommand, {}));
    assert.equal(applyWithoutPreset, "Pass at least one --preset or a --plan.");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

function readJson(result: unknown): unknown {
  if (typeof result !== "object" || result === null) return undefined;
  return "json" in result ? result.json : undefined;
}

function readExitCode(result: unknown): number {
  if (typeof result !== "object" || result === null) return 0;
  return "exitCode" in result && typeof result.exitCode === "number"
    ? result.exitCode
    : 0;
}
