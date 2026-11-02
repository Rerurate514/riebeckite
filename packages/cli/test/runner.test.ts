import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  type CliCommandDefinition,
  CliCommandError,
  type CliCommandRegistry,
  CliUsageError,
  cliBoolean,
  createCliCommandRegistry,
  defineCliCommand,
  registerCliCommand,
} from "@riebeckite/core";
import { createBuiltinRegistry } from "../src/command/builtins.js";
import { runCli } from "../src/command/runner.js";

function registryOf(
  ...commands: readonly CliCommandDefinition[]
): CliCommandRegistry {
  let registry = createCliCommandRegistry();
  for (const command of commands)
    registry = registerCliCommand(registry, command);
  return registry;
}

async function run(
  argv: readonly string[],
  options: { cwd?: string; registry?: CliCommandRegistry } = {},
): Promise<{ code: number; stdout: string; stderr: string }> {
  let stdout = "";
  let stderr = "";
  const code = await runCli({
    argv,
    cwd: options.cwd,
    version: "1.2.3",
    registry: options.registry,
    stdout: (text) => {
      stdout += text;
    },
    stderr: (text) => {
      stderr += text;
    },
  });
  return { code, stdout, stderr };
}

async function emptyDirectory(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "riebeckite-runner-"));
}

test("root help, version, and unknown commands stay lightweight", async () => {
  const cwd = await emptyDirectory();
  try {
    const help = await run(["--help"], { cwd });
    assert.equal(help.code, 0);
    assert.match(help.stdout, /Riebeckite CLI 1\.2\.3/);
    assert.match(help.stdout, /Usage: riebeckite <command> \[options\]/);
    assert.match(help.stdout, /-v, --version/);

    const version = await run(["--version"], { cwd });
    assert.equal(version.code, 0);
    assert.equal(version.stdout, "riebeckite 1.2.3\n");

    const unknown = await run(["buidl"], { cwd });
    assert.equal(unknown.code, 2);
    assert.match(unknown.stderr, /Unknown command: buidl/);
    assert.match(unknown.stderr, /build/);
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test("help output is generated from registry metadata", async () => {
  const registry = registerCliCommand(
    createBuiltinRegistry(),
    defineCliCommand({
      id: "demo",
      summary: "Run the demo.",
      arguments: [],
      options: [
        cliBoolean("verbose", { description: "Verbose output.", short: "v" }),
      ],
      examples: [
        { command: "riebeckite demo --verbose", description: "Loud mode." },
      ],
      handler() {},
    }),
  );
  const result = await run(["help", "demo"], { registry });
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /Usage: riebeckite demo \[options\]/);
  assert.match(result.stdout, /-v, --verbose/);
  assert.match(result.stdout, /riebeckite demo --verbose/);
});

test("maps command results and failures to exit codes", async () => {
  const registry = registryOf(
    defineCliCommand({
      id: "false",
      summary: "Return false.",
      handler() {
        return false;
      },
    }),
    defineCliCommand({
      id: "usage",
      summary: "Throw usage.",
      handler() {
        throw new CliUsageError("Bad input.");
      },
    }),
    defineCliCommand({
      id: "command",
      summary: "Throw command error.",
      supportsJson: true,
      handler() {
        throw new CliCommandError("Command failed.", { code: "DEMO_FAILED" });
      },
    }),
  );

  const falseResult = await run(["false"], { registry });
  assert.equal(falseResult.code, 1);

  const usage = await run(["usage"], { registry });
  assert.equal(usage.code, 2);
  assert.match(usage.stderr, /Bad input/);

  const usageJson = await run(["command", "--wat", "--json"], { registry });
  assert.equal(usageJson.code, 2);
  assert.deepEqual(JSON.parse(usageJson.stderr), {
    ok: false,
    error: {
      code: "CLI_USAGE",
      message: "Unknown option: --wat.",
      command: "command",
      exitCode: 2,
    },
  });

  const command = await run(["command"], { registry });
  assert.equal(command.code, 1);
  assert.match(command.stderr, /Command failed/);

  const json = await run(["command", "--json"], { registry });
  assert.equal(json.code, 1);
  assert.equal(json.stdout, "");
  assert.deepEqual(JSON.parse(json.stderr), {
    ok: false,
    error: {
      code: "DEMO_FAILED",
      message: "Command failed.",
      command: "command",
      exitCode: 1,
    },
  });
});

test("does not initialize a project for commands that do not need one", async () => {
  const cwd = await emptyDirectory();
  try {
    const registry = registryOf(
      defineCliCommand({
        id: "local",
        summary: "Run without a project.",
        handler() {
          return true;
        },
      }),
    );
    const result = await run(["local"], { registry, cwd });
    assert.equal(result.code, 0, result.stderr);
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});
