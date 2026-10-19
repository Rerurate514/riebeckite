import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { withTemporaryDirectory } from "@riebeckite/test/fixtures";
import {
  deploymentTemplateFiles,
  scaffoldDeploymentFromFlags,
} from "../src/scaffold/deployment.js";
import {
  ScaffoldSiteError,
  scaffoldRiebeckiteSite,
} from "../src/scaffold/index.js";
import { SCAFFOLD_PRESET_NAMES } from "../src/scaffold/presets.js";
import { readTemplate } from "../src/scaffold/template-loader.js";
import { GITHUB_ACTIONS_SECRETS } from "../src/scaffold/wrangler-defaults.js";

test("every scaffold preset inherits the same-repository GitHub Actions workflow", async () => {
  await withTemporaryDirectory(async (directory) => {
    for (const preset of SCAFFOLD_PRESET_NAMES) {
      const targetDirectory = path.join(directory, preset);
      await scaffoldRiebeckiteSite({
        targetDirectory,
        preset,
        deployment: { type: "github-actions", content: { type: "local" } },
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
        deployment: {
          type: "github-actions",
          content: {
            type: "external",
            contentRepository: "octo-org/notes",
            siteRepository: "octo-org/site",
          },
        },
      });
      const workflow = await fs.readFile(
        path.join(targetDirectory, ".github/workflows/deploy.yml"),
        "utf8",
      );
      const notify = await fs.readFile(
        path.join(targetDirectory, "github/notify-site.yml"),
        "utf8",
      );
      const readme = await fs.readFile(
        path.join(targetDirectory, "README.md"),
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
      assert.match(readme, /## Deployment secrets/);
      assert.match(readme, /RIEBECKITE_CONTENT_READ_TOKEN/);
      assert.match(readme, /SITE_DISPATCH_TOKEN/);
      assert.match(readme, /CLOUDFLARE_API_TOKEN/);
    }
  });
});

test("scaffoldDeploymentFromFlags rejects invalid flag combinations", () => {
  assert.throws(
    () =>
      scaffoldDeploymentFromFlags({
        githubActions: true,
        cloudflareWorkers: true,
      }),
    /--github-actions and --cloudflare-workers are mutually exclusive/,
  );
  assert.throws(
    () => scaffoldDeploymentFromFlags({ contentRepository: "octo-org/notes" }),
    /--content-repository requires --github-actions/,
  );
  assert.throws(
    () =>
      scaffoldDeploymentFromFlags({
        githubActions: true,
        contentRepository: "octo-org/notes",
      }),
    /--site-repository is required when --content-repository is used with --github-actions/,
  );
});

test("scaffold validates external repository format", async () => {
  await assert.rejects(
    () =>
      scaffoldRiebeckiteSite({
        targetDirectory: path.join(
          os.tmpdir(),
          "riebeckite-invalid-repository",
        ),
        deployment: {
          type: "github-actions",
          content: {
            type: "external",
            contentRepository: "not a repository",
            siteRepository: "octo-org/site",
          },
        },
      }),
    ScaffoldSiteError,
  );
  await assert.rejects(
    () =>
      scaffoldRiebeckiteSite({
        targetDirectory: path.join(os.tmpdir(), "riebeckite-invalid-site"),
        deployment: {
          type: "github-actions",
          content: {
            type: "external",
            contentRepository: "octo-org/notes",
            siteRepository: "not a repository",
          },
        },
      }),
    ScaffoldSiteError,
  );
});

test("the generated workflow is rendered from the packaged deployment template", () => {
  const template = new TextDecoder()
    .decode(readTemplate("deployment/github-actions/deploy.yml"))
    .replaceAll("\r\n", "\n");
  const files = deploymentTemplateFiles({ type: "local" });
  const workflow = files.find(
    (file) => file.path === ".github/workflows/deploy.yml",
  );
  assert.ok(workflow, "deploymentTemplateFiles must include deploy.yml");
  const generated = workflow.content;
  const generatedText =
    typeof generated === "string"
      ? generated
      : new TextDecoder().decode(generated);
  const normalized = generatedText.replaceAll("\r\n", "\n");
  const expected = template
    .replace("{{contentCheckout}}", "")
    .replaceAll(
      "{{cloudflareApiToken}}",
      GITHUB_ACTIONS_SECRETS.CLOUDFLARE_API_TOKEN,
    )
    .replaceAll(
      "{{cloudflareAccountId}}",
      GITHUB_ACTIONS_SECRETS.CLOUDFLARE_ACCOUNT_ID,
    );
  assert.equal(
    normalized,
    expected,
    "the generated workflow must be the packaged template with placeholders resolved",
  );
  for (const placeholder of [
    "{{contentCheckout}}",
    "{{cloudflareApiToken}}",
    "{{cloudflareAccountId}}",
  ]) {
    assert.ok(
      !normalized.includes(placeholder),
      `the generated workflow must not leak ${placeholder}`,
    );
  }
});

test("the external-content workflow and notify template render without leaking placeholders", () => {
  const files = deploymentTemplateFiles({
    type: "external",
    contentRepository: "octo-org/notes",
    siteRepository: "octo-org/site",
  });
  const workflow = files.find(
    (file) => file.path === ".github/workflows/deploy.yml",
  );
  const notify = files.find((file) => file.path === "github/notify-site.yml");
  assert.ok(workflow, "deploymentTemplateFiles must include deploy.yml");
  assert.ok(notify, "deploymentTemplateFiles must include notify-site.yml");
  const workflowText =
    typeof workflow.content === "string"
      ? workflow.content
      : new TextDecoder().decode(workflow.content);
  const notifyText =
    typeof notify.content === "string"
      ? notify.content
      : new TextDecoder().decode(notify.content);
  assert.ok(workflowText.includes("repository: octo-org/notes"));
  assert.ok(notifyText.includes('owner: "octo-org"'));
  assert.ok(notifyText.includes('repo: "site"'));
  for (const placeholder of [
    "{{contentCheckout}}",
    "{{contentRepository}}",
    "{{contentReadToken}}",
    "{{siteDispatchToken}}",
    "{{owner}}",
    "{{repository}}",
  ]) {
    assert.ok(
      !workflowText.includes(placeholder) && !notifyText.includes(placeholder),
      `the generated external-content files must not leak ${placeholder}`,
    );
  }
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
    ".riebeckite/ssg-output-cache.json",
    ".riebeckite/ssg-output-cache.entries",
    ".riebeckite/ssg-output-cache.fast-path.json",
  ]) {
    assert.ok(
      cacheStep.includes(cachePath),
      `build-state cache must include ${cachePath}`,
    );
  }
  assert.ok(
    !cacheStep.includes("dist"),
    "build-state cache must never include dist/ so the deploy artifact stays authoritative",
  );
  assert.ok(
    cacheStep.includes("continue-on-error: true"),
    "cache restore and save must never fail the deploy",
  );

  const key = extractCacheKey(cacheStep);
  const githubExpression = (expression: string) => `$${`{{ ${expression} }}`}`;
  assert.ok(
    key.includes("riebeckite-build-v2-"),
    "cache key must be versioned so stale contracts are never restored",
  );
  assert.ok(
    key.includes(githubExpression("runner.os")) &&
      key.includes(`node${githubExpression("env.NODE_VERSION")}`),
    "cache key must scope the runner OS and Node.js version",
  );
  assert.ok(
    key.includes(githubExpression("hashFiles('package-lock.json')")),
    "cache key must scope the dependency lockfile",
  );
  assert.ok(
    key.includes(githubExpression("hashFiles('riebeckite.config.ts')")),
    "cache key must scope the site configuration",
  );
  assert.ok(
    key.includes(
      `${githubExpression("github.run_id")}-${githubExpression("github.run_attempt")}`,
    ),
    "cache key must be unique per run and attempt so saved generations are immutable",
  );

  const restoreKeys = extractRestoreKeys(cacheStep);
  assert.equal(restoreKeys.length, 2, "workflow must define two fallback keys");
  for (const restoreKey of restoreKeys) {
    assert.ok(
      key.startsWith(restoreKey),
      `restore-key ${restoreKey} must be a prefix of the cache key`,
    );
  }
  assert.equal(
    restoreKeys[0],
    `riebeckite-build-v2-${githubExpression("runner.os")}-node${githubExpression("env.NODE_VERSION")}-${githubExpression("hashFiles('package-lock.json')")}-${githubExpression("hashFiles('riebeckite.config.ts')")}-`,
    "first restore-key must fall back within the same configuration",
  );
  assert.equal(
    restoreKeys[1],
    `riebeckite-build-v2-${githubExpression("runner.os")}-node${githubExpression("env.NODE_VERSION")}-${githubExpression("hashFiles('package-lock.json')")}-`,
    "second restore-key must fall back across configuration changes with the same dependencies",
  );

  assert.ok(
    workflow.includes('NODE_VERSION: "22"'),
    "workflow must define the pinned Node.js version used by setup-node and the cache key",
  );
  assert.ok(
    workflow.includes(`node-version: ${githubExpression("env.NODE_VERSION")}`),
    "setup-node must use the pinned Node.js version",
  );
  assert.ok(
    !workflow.includes("riebeckite-content-v3"),
    "workflow must not restore the dead content cache key",
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

function extractCacheKey(cacheStep: string): string {
  const line = cacheStep
    .split("\n")
    .find((candidate) => candidate.trim().startsWith("key:"));
  assert.ok(line, "cache step must define a key");
  return line.slice(line.indexOf("key:") + "key:".length).trim();
}

function extractRestoreKeys(cacheStep: string): string[] {
  const lines = cacheStep.split("\n");
  const markerIndex = lines.findIndex((line) =>
    line.includes("restore-keys: |"),
  );
  assert.ok(markerIndex >= 0, "cache step must define restore-keys");
  const restoreKeys: string[] = [];
  for (const line of lines.slice(markerIndex + 1)) {
    if (!line.trim()) {
      break;
    }
    restoreKeys.push(line.trim());
  }
  return restoreKeys;
}

async function assertFileIsAbsent(filePath: string): Promise<void> {
  await assert.rejects(fs.access(filePath));
}
