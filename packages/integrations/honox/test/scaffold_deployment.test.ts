import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  ScaffoldSiteError,
  scaffoldRiebeckiteSite,
} from "../src/scaffold/index.js";
import { SCAFFOLD_PRESET_NAMES } from "../src/scaffold/presets.js";

test("every scaffold preset inherits the same-repository GitHub Actions workflow", async () => {
  await withTemporaryDirectory(async (directory) => {
    for (const preset of SCAFFOLD_PRESET_NAMES) {
      const targetDirectory = path.join(directory, preset);
      await scaffoldRiebeckiteSite({
        targetDirectory,
        preset,
        githubActions: true,
      });
      const workflow = await fs.readFile(
        path.join(targetDirectory, ".github/workflows/deploy.yml"),
        "utf8",
      );
      assertWorkflowContract(workflow);
      assert.ok(!workflow.includes("external content repository"));
    }
  });
});

test("every scaffold preset omits deployment files until GitHub Actions is requested", async () => {
  await withTemporaryDirectory(async (directory) => {
    for (const preset of SCAFFOLD_PRESET_NAMES) {
      const targetDirectory = path.join(directory, preset);
      await scaffoldRiebeckiteSite({ targetDirectory, preset });
      await assert.rejects(
        fs.access(path.join(targetDirectory, ".github/workflows/deploy.yml")),
      );
    }
  });
});

test("every scaffold preset supports external content and content-push dispatch", async () => {
  await withTemporaryDirectory(async (directory) => {
    for (const preset of SCAFFOLD_PRESET_NAMES) {
      const targetDirectory = path.join(directory, preset);
      await scaffoldRiebeckiteSite({
        targetDirectory,
        preset,
        githubActions: true,
        contentRepository: "octo-org/notes",
        siteRepository: "octo-org/site",
        notifyOnContentPush: true,
      });
      const workflow = await fs.readFile(
        path.join(targetDirectory, ".github/workflows/deploy.yml"),
        "utf8",
      );
      const notify = await fs.readFile(
        path.join(targetDirectory, "github/notify-site.yml"),
        "utf8",
      );
      assertWorkflowContract(workflow);
      assert.match(workflow, /repository: octo-org\/notes/);
      assert.match(workflow, /RIEBECKITE_CONTENT_READ_TOKEN \|\| github.token/);
      assert.match(notify, /owner: "octo-org"/);
      assert.match(notify, /repo: "site"/);
      assert.match(notify, /SITE_DISPATCH_TOKEN/);
      assert.match(notify, /event_type: "content-updated"/);
    }
  });
});

test("scaffold rejects malformed external repository names", async () => {
  await assert.rejects(
    () =>
      scaffoldRiebeckiteSite({
        targetDirectory: path.join(
          os.tmpdir(),
          "riebeckite-invalid-repository",
        ),
        githubActions: true,
        contentRepository: "not a repository",
      }),
    ScaffoldSiteError,
  );
});

function assertWorkflowContract(workflow: string): void {
  for (const value of [
    "on:",
    "push:",
    "workflow_dispatch:",
    "repository_dispatch:",
    "types: [content-updated]",
    "concurrency:",
    "contents: read",
    "npm exec riebeckite check",
    "npm exec riebeckite build",
  ]) {
    assert.ok(workflow.includes(value), `workflow is missing ${value}`);
  }
}

async function withTemporaryDirectory(
  callback: (directory: string) => Promise<void>,
): Promise<void> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "riebeckite-"));
  try {
    await callback(directory);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}
