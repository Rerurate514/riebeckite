import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { deploymentTemplateFiles } from "../src/scaffold/deployment.js";
import {
  ScaffoldSiteError,
  scaffoldRiebeckiteSite,
} from "../src/scaffold/index.js";
import { SCAFFOLD_PRESET_NAMES } from "../src/scaffold/presets.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);

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
      await assertFileIsAbsent(
        path.join(targetDirectory, "github/notify-site.yml"),
      );
    }
  });
});

test("every scaffold preset omits deployment files until GitHub Actions is requested", async () => {
  await withTemporaryDirectory(async (directory) => {
    for (const preset of SCAFFOLD_PRESET_NAMES) {
      const targetDirectory = path.join(directory, preset);
      await scaffoldRiebeckiteSite({ targetDirectory, preset });
      await assertFileIsAbsent(
        path.join(targetDirectory, ".github/workflows/deploy.yml"),
      );
      await assertFileIsAbsent(
        path.join(targetDirectory, "github/notify-site.yml"),
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
      assert.match(workflow, /Check out the external content repository/);
      assert.match(workflow, /repository: octo-org\/notes/);
      assert.match(workflow, /RIEBECKITE_CONTENT_READ_TOKEN \|\| github.token/);
      assert.match(workflow, /path: content/);
      assert.match(notify, /owner: "octo-org"/);
      assert.match(notify, /repo: "site"/);
      assert.match(notify, /SITE_DISPATCH_TOKEN/);
      assert.match(notify, /event_type: "content-updated"/);
    }
  });
});

test("scaffold validates external-content deployment options", async () => {
  await assert.rejects(
    () =>
      scaffoldRiebeckiteSite({
        targetDirectory: path.join(
          os.tmpdir(),
          "riebeckite-external-no-actions",
        ),
        contentRepository: "octo-org/notes",
      }),
    /--content-repository requires --github-actions/,
  );
  await assert.rejects(
    () =>
      scaffoldRiebeckiteSite({
        targetDirectory: path.join(os.tmpdir(), "riebeckite-external-no-site"),
        githubActions: true,
        contentRepository: "octo-org/notes",
      }),
    /--site-repository is required when --content-repository is used with --github-actions/,
  );
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
  await assert.rejects(
    () =>
      scaffoldRiebeckiteSite({
        targetDirectory: path.join(os.tmpdir(), "riebeckite-invalid-site"),
        githubActions: true,
        contentRepository: "octo-org/notes",
        siteRepository: "not a repository",
      }),
    ScaffoldSiteError,
  );
});

test("the Cloudflare template matches the generated same-repository workflow", async () => {
  const files = deploymentTemplateFiles({});
  const workflow = files.find(
    (file) => file.path === ".github/workflows/deploy.yml",
  );
  assert.ok(workflow, "deploymentTemplateFiles must include deploy.yml");
  const template = await fs.readFile(
    path.join(
      repoRoot,
      "templates",
      "cloudflare",
      ".github",
      "workflows",
      "deploy.yml",
    ),
    "utf8",
  );
  const generated = workflow.content;
  const generatedText =
    typeof generated === "string"
      ? generated
      : new TextDecoder().decode(generated);
  assert.equal(
    generatedText.replaceAll("\r\n", "\n"),
    template.replaceAll("\r\n", "\n"),
    "templates/cloudflare must match the generated same-repository workflow",
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
    "actions/cache@v4",
    "npm exec riebeckite check",
    "npm exec riebeckite build",
  ]) {
    assert.ok(workflow.includes(value), `workflow is missing ${value}`);
  }
  assertBuildStateCacheContract(workflow);
}

function assertBuildStateCacheContract(workflow: string): void {
  const cacheStepStart = workflow.indexOf("actions/cache@v4");
  assert.ok(cacheStepStart >= 0, "workflow must restore a Actions cache");
  const cacheStepEnd = workflow.indexOf("\n\n", cacheStepStart);
  const cacheStep = workflow.slice(
    cacheStepStart,
    cacheStepEnd === -1 ? undefined : cacheStepEnd,
  );

  for (const cachePath of [
    ".riebeckite/cache",
    ".riebeckite/build/content-state.json",
  ]) {
    assert.ok(
      cacheStep.includes(cachePath),
      `build-state cache must include ${cachePath}`,
    );
  }
  assert.ok(
    !cacheStep.includes("dist"),
    "build-state cache must never include dist/",
  );
  assert.ok(
    !cacheStep.includes("ssg-output-cache.json"),
    "output cache must stay out of the build-state cache to avoid large transfers",
  );
  assert.ok(
    /key: riebeckite-build-v1-\$\{\{ runner\.os \}\}-\$\{\{ hashFiles\('package-lock\.json'\) \}\}-\$\{\{ github\.run_id \}\}-\$\{\{ github\.run_attempt \}\}/.test(
      cacheStep,
    ),
    "cache key must be unique per run and attempt while scoping runner OS and lockfile",
  );
  assert.ok(
    cacheStep.includes(
      "\n          restore-keys: |\n            riebeckite-build-v1-$" +
        "{{ runner.os }}-$" +
        "{{ hashFiles('package-lock.json') }}-\n",
    ),
    "restore-keys must select the newest compatible generation",
  );
  assert.ok(
    cacheStep.includes(
      "riebeckite-content-v3-$" +
        "{{ runner.os }}-$" +
        "{{ hashFiles('package-lock.json') }}",
    ),
    "restore-keys must fall back to the previous persistent content cache",
  );

  const installIndex = workflow.indexOf("npm ci");
  const restoreIndex = workflow.indexOf("actions/cache@v4");
  const checkIndex = workflow.indexOf("npm exec riebeckite check");
  const buildIndex = workflow.indexOf("npm exec riebeckite build");
  const deployIndex = workflow.indexOf("cloudflare/wrangler-action");
  assert.ok(
    installIndex >= 0 &&
      installIndex < restoreIndex &&
      restoreIndex < checkIndex &&
      checkIndex < buildIndex &&
      buildIndex < deployIndex,
    "workflow must install, restore state, check, build, then deploy",
  );
}

async function assertFileIsAbsent(filePath: string): Promise<void> {
  await assert.rejects(fs.access(filePath));
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
