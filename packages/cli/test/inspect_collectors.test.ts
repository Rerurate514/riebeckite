import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import type { ResolvedRiebeckiteConfig } from "@riebeckite/core";
import {
  computePipelineFingerprint,
  resolveContentBuildStatePath,
} from "@riebeckite/core";
import type { RiebeckiteProject } from "../src/application_root.js";
import { checkContent } from "../src/doctor/checks/content.js";
import {
  collectBuildInspection,
  collectContentInspection,
} from "../src/inspect/collectors.js";

const baseConfig = {
  site: {
    title: "Test",
    description: "",
    author: "",
    baseUrl: "",
    locale: "en",
    twitterSite: "",
    defaultOgImage: "",
    feed: { title: "Test", description: "", language: "en" },
  },
  content: {
    directory: "",
    exclude: ["drafts/**"],
    filters: { publishStrategy: "explicit" },
  },
  theme: {
    name: "riebeckite",
    colorMode: "system",
    typography: "system",
    articleLayout: "article",
    tokens: {},
    attributes: {},
    userCss: [],
    styles: [],
  },
  plugins: [],
  cache: { enabled: true, directory: ".riebeckite/cache" },
} satisfies ResolvedRiebeckiteConfig;

async function makeProject(root: string): Promise<RiebeckiteProject> {
  return {
    invocationCwd: root,
    projectRoot: root,
    configRoot: root,
    configPath: path.join(root, "riebeckite.config.ts"),
    appRoot: root,
    contentRoot: root,
    config: {} as RiebeckiteProject["config"],
  };
}

async function makeContentRoot(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "riebeckite-inspect-"));
  await fs.writeFile(path.join(root, "index.md"), "# Home");
  await fs.mkdir(path.join(root, "drafts"));
  await fs.writeFile(path.join(root, "drafts", "hidden.md"), "# Hidden");
  return root;
}

test("inspect content reports excluded entries and their patterns", async () => {
  const root = await makeContentRoot();
  const config: ResolvedRiebeckiteConfig = {
    ...baseConfig,
    content: { ...baseConfig.content, directory: root },
  };
  const inspection = await collectContentInspection(
    config,
    await makeProject(root),
  );

  assert.equal(inspection.entryCount, 1);
  assert.deepEqual(inspection.excluded, [
    { path: "drafts/hidden.md", pattern: "drafts/**" },
  ]);
});

test("doctor content reports why entries were excluded", async () => {
  const root = await makeContentRoot();
  const config: ResolvedRiebeckiteConfig = {
    ...baseConfig,
    content: { ...baseConfig.content, directory: root },
  };
  const result = await checkContent(await makeProject(root), config);

  assert.equal(result.status, "ok");
  assert.match(result.message ?? "", /1 content entries scanned/);
  assert.deepEqual(result.details, [
    "Excluded by content.exclude: 1",
    "drafts/hidden.md (drafts/**)",
  ]);
});

test("inspect build reports a missing state as not created", async () => {
  const root = await makeContentRoot();
  const config: ResolvedRiebeckiteConfig = {
    ...baseConfig,
    content: { ...baseConfig.content, directory: root },
  };

  assert.deepEqual(await collectBuildInspection(config), {
    status: "not created",
  });
});

test("inspect build reports reuse when the pipeline fingerprint matches", async () => {
  const root = await makeContentRoot();
  const config: ResolvedRiebeckiteConfig = {
    ...baseConfig,
    content: { ...baseConfig.content, directory: root },
  };
  const statePath = resolveContentBuildStatePath(config, undefined);
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(
    statePath,
    JSON.stringify({
      version: 8,
      entries: {},
      contentIndex: {},
      pipelineFingerprint: computePipelineFingerprint(config),
    }),
  );

  const inspection = await collectBuildInspection(config);
  assert.equal(inspection.status, "valid");
  assert.equal(inspection.status === "valid" && inspection.reusable, true);
});

test("inspect build reports reuse as unavailable when the cache is bypassed", async () => {
  const root = await makeContentRoot();
  const config: ResolvedRiebeckiteConfig = {
    ...baseConfig,
    content: { ...baseConfig.content, directory: root },
    plugins: [{ name: "l10n" }],
  };
  const statePath = resolveContentBuildStatePath(config, undefined);
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(
    statePath,
    JSON.stringify({
      version: 8,
      entries: {},
      contentIndex: {},
      pipelineFingerprint: computePipelineFingerprint(config),
    }),
  );

  const inspection = await collectBuildInspection(config);
  assert.equal(inspection.status === "valid" && inspection.reusable, false);
});
