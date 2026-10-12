import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { withTemporaryDirectory } from "@riebeckite/test/fixtures";
import { scaffoldRiebeckiteSite } from "../src/scaffold/index.js";
import { SCAFFOLD_DEFAULT_PRESET } from "../src/scaffold/presets.js";
import {
  CLOUDFLARE_WORKERS_DEFAULTS,
  DEFAULT_WORKER_NAME,
  GITHUB_ACTIONS_SECRETS,
  GITIGNORE_FORBIDDEN,
  GITIGNORE_REQUIRED,
} from "../src/scaffold/wrangler-defaults.js";
import {
  generateStarterSite,
  readScaffoldFile,
} from "./support/scaffold_site.js";

test("generated wrangler.jsonc matches canonical defaults", async () => {
  await withTemporaryDirectory("riebeckite-contract-", async (tmpDir) => {
    const targetDir = path.join(tmpDir, "test-site");
    await generateStarterSite(targetDir);
    const content = await readScaffoldFile(targetDir, "wrangler.jsonc");
    assert.ok(content, "wrangler.jsonc must be generated");
    const wrangler = JSON.parse(content);
    assert.equal(wrangler.$schema, CLOUDFLARE_WORKERS_DEFAULTS.$schema);
    assert.equal(wrangler.name, DEFAULT_WORKER_NAME);
    assert.equal(
      wrangler.compatibility_date,
      CLOUDFLARE_WORKERS_DEFAULTS.compatibility_date,
    );
    assert.deepEqual(
      wrangler.compatibility_flags,
      CLOUDFLARE_WORKERS_DEFAULTS.compatibility_flags,
    );
    assert.deepEqual(wrangler.assets, CLOUDFLARE_WORKERS_DEFAULTS.assets);
  });
});

test("generated workflow includes required secret names", async () => {
  await withTemporaryDirectory("riebeckite-contract-", async (tmpDir) => {
    const targetDir = path.join(tmpDir, "test-site");
    await generateStarterSite(targetDir);
    const workflow = await readScaffoldFile(
      targetDir,
      ".github/workflows/deploy.yml",
    );
    assert.ok(workflow, "deploy.yml must exist");
    assert.ok(workflow.includes(GITHUB_ACTIONS_SECRETS.CLOUDFLARE_API_TOKEN));
    assert.ok(workflow.includes(GITHUB_ACTIONS_SECRETS.CLOUDFLARE_ACCOUNT_ID));
    assert.ok(workflow.includes("secrets.CLOUDFLARE_API_TOKEN"));
    assert.ok(workflow.includes("secrets.CLOUDFLARE_ACCOUNT_ID"));
  });
});

test("external content workflow includes additional secrets", async () => {
  await withTemporaryDirectory("riebeckite-contract-", async (tmpDir) => {
    const targetDir = path.join(tmpDir, "test-site");
    await scaffoldRiebeckiteSite({
      targetDirectory: targetDir,
      preset: SCAFFOLD_DEFAULT_PRESET,
      deployment: {
        type: "github-actions",
        content: {
          type: "external",
          contentRepository: "octo-org/notes",
          siteRepository: "octo-org/site",
        },
      },
    });
    const workflow = await readScaffoldFile(
      targetDir,
      ".github/workflows/deploy.yml",
    );
    const notify = await readScaffoldFile(targetDir, "github/notify-site.yml");
    assert.ok(workflow, "deploy.yml must exist");
    assert.ok(notify, "notify-site.yml must exist for external content");
    assert.ok(
      workflow.includes(GITHUB_ACTIONS_SECRETS.RIEBECKITE_CONTENT_READ_TOKEN),
    );
    assert.ok(notify.includes(GITHUB_ACTIONS_SECRETS.SITE_DISPATCH_TOKEN));
  });
});

test("generated .gitignore excludes build artifacts but keeps lockfile", async () => {
  await withTemporaryDirectory("riebeckite-contract-", async (tmpDir) => {
    const targetDir = path.join(tmpDir, "test-site");
    await generateStarterSite(targetDir);
    const gitignore = await readScaffoldFile(targetDir, ".gitignore");
    assert.ok(gitignore, ".gitignore must exist");
    for (const pattern of GITIGNORE_REQUIRED) {
      assert.ok(
        gitignore.includes(pattern),
        `.gitignore must exclude ${pattern}`,
      );
    }
    for (const pattern of GITIGNORE_FORBIDDEN) {
      assert.ok(
        !gitignore.includes(pattern),
        `.gitignore must not exclude ${pattern}`,
      );
    }
  });
});
