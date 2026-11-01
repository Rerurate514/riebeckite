import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type CliProjectContext,
  createCliCommandRegistry,
} from "@riebeckite/core";
import { createCliCommandContext } from "../src/command/context.js";

function project(): CliProjectContext {
  return {
    invocationCwd: "C:/site",
    projectRoot: "C:/site",
    configRoot: "C:/site",
    configPath: "C:/site/riebeckite.config.ts",
    appRoot: "C:/site/app",
    contentRoot: "C:/site/content",
    config: {} as CliProjectContext["config"],
  };
}

function writers() {
  let stdout = "";
  let stderr = "";
  return {
    writers: {
      stdout: (text: string) => {
        stdout += text;
      },
      stderr: (text: string) => {
        stderr += text;
      },
    },
    stdout: () => stdout,
    stderr: () => stderr,
  };
}

test("writes logs and diagnostics without corrupting JSON stdout", async () => {
  const target = writers();
  const context = createCliCommandContext({
    cwd: "C:/site",
    env: {},
    json: true,
    registry: createCliCommandRegistry(),
    writers: target.writers,
  });
  context.logger.info("human note");
  context.output.json({ ok: true });
  context.diagnostics.report({
    code: "DEMO",
    severity: "warning",
    message: "Careful.",
    file: "app/server.ts",
  });
  await context.dispose();

  assert.equal(target.stdout(), '{"ok":true}\n');
  assert.match(target.stderr(), /human note/);
  assert.match(
    target.stderr(),
    /warning: Careful\. \(app\/server\.ts\) \[DEMO\]/,
  );
});

test("loads the project once and exposes it on the context", async () => {
  let calls = 0;
  const context = createCliCommandContext({
    cwd: "C:/site",
    env: {},
    json: false,
    registry: createCliCommandRegistry(),
    writers: writers().writers,
    projectLoader: async () => {
      calls += 1;
      return project();
    },
  });
  const first = await context.loadProject();
  const second = await context.loadProject();
  assert.equal(calls, 1);
  assert.equal(first, second);
  assert.equal(context.projectRoot, "C:/site");
  assert.equal(context.config, first.config);
});

test("runs cleanup handlers in reverse order even when one fails", async () => {
  const order: string[] = [];
  const context = createCliCommandContext({
    cwd: ".",
    env: {},
    json: false,
    registry: createCliCommandRegistry(),
    writers: writers().writers,
  });
  context.onCleanup(() => {
    order.push("first");
  });
  context.onCleanup(async () => {
    order.push("second");
    throw new Error("cleanup failed");
  });
  context.onCleanup(() => {
    order.push("third");
  });
  await assert.rejects(context.dispose(), /cleanup failed/);
  assert.deepEqual(order, ["third", "second", "first"]);
});
