import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { deploymentWorkflow } from "create-riebeckite/scaffold";
import type { RiebeckiteProject } from "../src/application_root.js";
import {
  DeployWorkflowError,
  runDeployWorkflow,
} from "../src/commands/deploy_workflow.js";

const WORKFLOW_RELATIVE_PATH = ".github/workflows/publish.yml";
const ENABLED = { enabled: true, intervalMinutes: 15 };

type Schedule = { enabled: boolean; intervalMinutes: number };

function project(root: string, schedule: Schedule): RiebeckiteProject {
  return {
    projectRoot: root,
    config: { publication: { schedule } },
  } as RiebeckiteProject;
}

async function makeRepo(): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), "riebeckite-workflow-"));
}

async function writeWorkflow(repoRoot: string, content: string): Promise<void> {
  const filePath = path.join(repoRoot, WORKFLOW_RELATIVE_PATH);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
}

async function readWorkflow(repoRoot: string): Promise<string> {
  return await fs.readFile(path.join(repoRoot, WORKFLOW_RELATIVE_PATH), "utf8");
}

async function run(
  repoRoot: string,
  schedule: Schedule,
  check = false,
): Promise<string[]> {
  const lines: string[] = [];
  await runDeployWorkflow(project(repoRoot, schedule), {
    check,
    writeLine: (line) => lines.push(line),
  });
  return lines;
}

test("deploy workflow creates the workflow with the configured schedule", async () => {
  const repoRoot = await makeRepo();
  try {
    const schedule = { enabled: true, intervalMinutes: 30 };
    const lines = await run(repoRoot, schedule);
    assert.ok(lines.includes("✓ Created .github/workflows/publish.yml"));
    assert.equal(
      await readWorkflow(repoRoot),
      deploymentWorkflow(undefined, schedule),
    );
    assert.match(
      await readWorkflow(repoRoot),
      /schedule:\n {4}- cron: "\*\/30 \* \* \* \*"/,
    );
  } finally {
    await fs.rm(repoRoot, { recursive: true, force: true });
  }
});

test("deploy workflow fails a check when the workflow is missing", async () => {
  const repoRoot = await makeRepo();
  try {
    await assert.rejects(
      () => run(repoRoot, ENABLED, true),
      DeployWorkflowError,
    );
  } finally {
    await fs.rm(repoRoot, { recursive: true, force: true });
  }
});

test("deploy workflow updates only the schedule and preserves external content", async () => {
  const repoRoot = await makeRepo();
  try {
    const external = deploymentWorkflow(
      {
        type: "external",
        contentRepository: "octo-org/notes",
        siteRepository: "octo-org/site",
      },
      { enabled: true, intervalMinutes: 15 },
    );
    await writeWorkflow(repoRoot, external);
    const lines = await run(repoRoot, {
      enabled: true,
      intervalMinutes: 30,
    });
    const updated = await readWorkflow(repoRoot);
    assert.ok(lines.includes("✓ Updated .github/workflows/publish.yml"));
    assert.ok(updated.includes("Check out the external content repository"));
    assert.ok(updated.includes('cron: "*/30 * * * *"'));
    assert.ok(!updated.includes('cron: "*/15 * * * *"'));
  } finally {
    await fs.rm(repoRoot, { recursive: true, force: true });
  }
});

test("deploy workflow removes the schedule when it is disabled", async () => {
  const repoRoot = await makeRepo();
  try {
    await writeWorkflow(
      repoRoot,
      deploymentWorkflow(undefined, { enabled: true, intervalMinutes: 30 }),
    );
    await run(repoRoot, { enabled: false, intervalMinutes: 30 });
    const updated = await readWorkflow(repoRoot);
    assert.ok(!updated.includes("schedule:"));
    assert.ok(updated.includes("workflow_dispatch:"));
  } finally {
    await fs.rm(repoRoot, { recursive: true, force: true });
  }
});

test("deploy workflow reports when the workflow is already current", async () => {
  const repoRoot = await makeRepo();
  try {
    await writeWorkflow(repoRoot, deploymentWorkflow(undefined, ENABLED));
    const lines = await run(repoRoot, ENABLED, true);
    assert.ok(lines.includes("✓ .github/workflows/publish.yml is up to date"));
  } finally {
    await fs.rm(repoRoot, { recursive: true, force: true });
  }
});

test("deploy workflow fails a check when the schedule differs", async () => {
  const repoRoot = await makeRepo();
  try {
    await writeWorkflow(
      repoRoot,
      deploymentWorkflow(undefined, { enabled: true, intervalMinutes: 15 }),
    );
    await assert.rejects(
      () => run(repoRoot, { enabled: true, intervalMinutes: 30 }, true),
      DeployWorkflowError,
    );
    assert.match(await readWorkflow(repoRoot), /cron: "\*\/15 \* \* \* \*"/);
  } finally {
    await fs.rm(repoRoot, { recursive: true, force: true });
  }
});

test("deploy workflow leaves an unknown workflow untouched", async () => {
  const repoRoot = await makeRepo();
  try {
    const custom =
      "name: Custom\non: push\njobs:\n  build:\n    runs-on: ubuntu-latest\n";
    await writeWorkflow(repoRoot, custom);
    await assert.rejects(() => run(repoRoot, ENABLED), DeployWorkflowError);
    assert.equal(await readWorkflow(repoRoot), custom);
  } finally {
    await fs.rm(repoRoot, { recursive: true, force: true });
  }
});
