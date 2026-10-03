import assert from "node:assert/strict";
import { test } from "node:test";
import { packageManagerCommands } from "../src/package-manager.js";
import {
  buildAndDeploy,
  DeploymentFailure,
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

test("buildAndDeploy builds before deploying", async () => {
  const commands = packageManagerCommands("npm");
  const { calls, run } = createSequenceRunner([]);

  await buildAndDeploy("C:/site", commands, run);

  assert.deepEqual(calls, [
    { command: "npm", args: ["run", "build"], cwd: "C:/site" },
    { command: "npm", args: ["exec", "riebeckite", "deploy"], cwd: "C:/site" },
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

test("a failed build is reported and stops before deploy", async () => {
  const commands = packageManagerCommands("npm");
  const { calls, run } = createSequenceRunner([1]);

  await assert.rejects(
    () => buildAndDeploy("C:/site", commands, run),
    (error: unknown) => {
      assert.ok(error instanceof DeploymentFailure);
      assert.equal(error.phase, "build");
      return true;
    },
  );
  assert.equal(calls.length, 1);
});

test("a failed deploy reports the deploy phase", async () => {
  const commands = packageManagerCommands("npm");
  const { calls, run } = createSequenceRunner([0, 1]);

  await assert.rejects(
    () => buildAndDeploy("C:/site", commands, run),
    (error: unknown) => {
      assert.ok(error instanceof DeploymentFailure);
      assert.equal(error.phase, "deploy");
      return true;
    },
  );
  assert.equal(calls.length, 2);
});

test("a thrown runner error becomes a phase failure", async () => {
  const commands = packageManagerCommands("npm");
  const run: CommandRunner = async () => {
    throw new Error("spawn failed");
  };

  await assert.rejects(
    () => buildAndDeploy("C:/site", commands, run),
    (error: unknown) => {
      assert.ok(error instanceof DeploymentFailure);
      assert.equal(error.phase, "build");
      assert.equal(error.message, "spawn failed");
      return true;
    },
  );
});

test("formatCloudflareNextSteps prints build then deploy commands", () => {
  const commands = packageManagerCommands("npm");
  assert.equal(
    formatCloudflareNextSteps("my-site", commands),
    [
      "Next steps:",
      "  cd my-site",
      "  npm run build",
      "  npm exec riebeckite deploy",
    ].join("\n"),
  );
});

test("formatCloudflareNextSteps omits cd for the current directory", () => {
  const commands = packageManagerCommands("pnpm");
  assert.equal(
    formatCloudflareNextSteps(".", commands),
    ["Next steps:", "  pnpm build", "  pnpm exec riebeckite deploy"].join("\n"),
  );
});

test("packageManagerCommands maps npm and pnpm without hardcoding", () => {
  assert.deepEqual(packageManagerCommands("pnpm").deploy, {
    command: "pnpm",
    args: ["exec", "riebeckite", "deploy"],
    label: "pnpm exec riebeckite deploy",
  });
  assert.deepEqual(packageManagerCommands("npm").build, {
    command: "npm",
    args: ["run", "build"],
    label: "npm run build",
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
      "  npm run build",
      "  npm exec riebeckite deploy",
    ].join("\n"),
  );
});

test("formatDeploymentFailure reports a build failure with build and deploy retries", () => {
  const commands = packageManagerCommands("pnpm");
  const failure = new DeploymentFailure(
    "build",
    "pnpm build exited with code 2.",
  );

  assert.equal(
    formatDeploymentFailure(".", commands, failure),
    [
      "Project created successfully.",
      "Build failed.",
      "pnpm build exited with code 2.",
      "You can retry with:",
      "  pnpm build",
      "  pnpm exec riebeckite deploy",
    ].join("\n"),
  );
});

test("formatDeploymentFailure reports a deploy failure without an install retry", () => {
  const commands = packageManagerCommands("npm");
  const failure = new DeploymentFailure(
    "deploy",
    "npm exec riebeckite deploy exited with code 1.",
  );

  assert.equal(
    formatDeploymentFailure(".", commands, failure),
    [
      "Project created successfully.",
      "Deployment failed.",
      "npm exec riebeckite deploy exited with code 1.",
      "You can retry with:",
      "  npm run build",
      "  npm exec riebeckite deploy",
    ].join("\n"),
  );
});
