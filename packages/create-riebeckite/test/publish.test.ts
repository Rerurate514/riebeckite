import assert from "node:assert/strict";
import { test } from "node:test";
import { packageManagerCommands } from "../src/package-manager.js";
import {
  DeploymentFailure,
  deploySite,
  formatCloudflareNextSteps,
  formatDeploymentFailure,
  installDependencies,
} from "../src/publish.js";
import type { CommandRunner } from "../src/run-commands.js";

type RecordedCall = {
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd: string;
};

function createSequenceRunner(exitCodes: readonly number[]): {
  readonly calls: RecordedCall[];
  readonly run: CommandRunner;
} {
  const calls: RecordedCall[] = [];
  let index = 0;
  const run: CommandRunner = async (command, args, cwd) => {
    calls.push({ command, args, cwd });
    const code = exitCodes[index] ?? 0;
    index += 1;
    return code;
  };
  return { calls, run };
}

test("installDependencies runs the package manager install command in the project", async () => {
  const commands = packageManagerCommands("npm");
  const { calls, run } = createSequenceRunner([]);

  await installDependencies("C:/site", commands, run);

  assert.deepEqual(calls, [
    { command: "npm", args: ["install"], cwd: "C:/site" },
  ]);
});

test("deploySite runs the unified publish command", async () => {
  const commands = packageManagerCommands("npm");
  const { calls, run } = createSequenceRunner([]);

  await deploySite("C:/site", commands, run);

  assert.deepEqual(calls, [
    {
      command: "npm",
      args: ["exec", "riebeckite", "publish", "run", "--execute"],
      cwd: "C:/site",
    },
  ]);
});

test("a failed install reports the install phase", async () => {
  const commands = packageManagerCommands("npm");
  const { run } = createSequenceRunner([1]);

  await assert.rejects(
    () => installDependencies("C:/site", commands, run),
    (error: unknown) => {
      assert.ok(error instanceof DeploymentFailure);
      assert.equal(error.phase, "install");
      return true;
    },
  );
});

test("a failed publish reports the deploy phase", async () => {
  const commands = packageManagerCommands("npm");
  const { calls, run } = createSequenceRunner([1]);

  await assert.rejects(
    () => deploySite("C:/site", commands, run),
    (error: unknown) => {
      assert.ok(error instanceof DeploymentFailure);
      assert.equal(error.phase, "deploy");
      return true;
    },
  );
  assert.equal(calls.length, 1);
});

test("a thrown runner error becomes a deploy failure", async () => {
  const commands = packageManagerCommands("npm");
  const run: CommandRunner = async () => {
    throw new Error("spawn failed");
  };

  await assert.rejects(
    () => deploySite("C:/site", commands, run),
    (error: unknown) => {
      assert.ok(error instanceof DeploymentFailure);
      assert.equal(error.phase, "deploy");
      assert.equal(error.message, "spawn failed");
      return true;
    },
  );
});

test("formatCloudflareNextSteps prints the publish command", () => {
  const commands = packageManagerCommands("npm");
  assert.equal(
    formatCloudflareNextSteps("my-site", commands),
    [
      "Next steps:",
      "  cd my-site",
      "  npm exec riebeckite publish run --execute",
    ].join("\n"),
  );
});

test("formatCloudflareNextSteps omits cd for the current directory", () => {
  const commands = packageManagerCommands("pnpm");
  assert.equal(
    formatCloudflareNextSteps(".", commands),
    ["Next steps:", "  pnpm exec riebeckite publish run --execute"].join("\n"),
  );
});

test("packageManagerCommands maps npm and pnpm without hardcoding", () => {
  assert.deepEqual(packageManagerCommands("pnpm").deploy, {
    command: "pnpm",
    args: ["exec", "riebeckite", "publish", "run", "--execute"],
    label: "pnpm exec riebeckite publish run --execute",
  });
  assert.deepEqual(packageManagerCommands("npm").deploy, {
    command: "npm",
    args: ["exec", "riebeckite", "publish", "run", "--execute"],
    label: "npm exec riebeckite publish run --execute",
  });
});

test("formatDeploymentFailure distinguishes a created project from a failed install", () => {
  const commands = packageManagerCommands("npm");
  const failure = new DeploymentFailure(
    "install",
    "npm install exited with code 1.",
  );

  assert.equal(
    formatDeploymentFailure("my-site", commands, failure),
    [
      "Project created successfully.",
      "Installing dependencies failed.",
      "npm install exited with code 1.",
      "You can retry with:",
      "  cd my-site",
      "  npm install",
      "  npm exec riebeckite publish run --execute",
    ].join("\n"),
  );
});

test("formatDeploymentFailure reports a deploy failure without an install retry", () => {
  const commands = packageManagerCommands("npm");
  const failure = new DeploymentFailure(
    "deploy",
    "npm exec riebeckite publish run --execute exited with code 1.",
  );

  assert.equal(
    formatDeploymentFailure(".", commands, failure),
    [
      "Project created successfully.",
      "Deployment failed.",
      "npm exec riebeckite publish run --execute exited with code 1.",
      "You can retry with:",
      "  npm exec riebeckite publish run --execute",
    ].join("\n"),
  );
});
