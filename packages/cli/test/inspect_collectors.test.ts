import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import type {
  BuildProvenance,
  ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import {
  CONTENT_BUILD_STATE_VERSION,
  computePipelineFingerprint,
  resolveContentBuildStatePath,
} from "@riebeckite/core";
import type { RiebeckiteProject } from "../src/application_root.js";
import {
  collectBuildInspection,
  collectContentInspection,
  collectProvenanceInspection,
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
    layout: "article",
    stylesheets: [],
    settings: { values: {}, attributes: {}, style: "" },
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

function provenance(buildId: string, slug: string): BuildProvenance {
  return {
    version: 1,
    buildId,
    sources: [
      {
        id: `source:${slug}.md`,
        contentId: slug,
        path: `${slug}.md`,
        fingerprint: `sha256:${"a".repeat(64)}`,
        type: "markdown",
        visibility: "public",
        evidence: "deterministic",
      },
    ],
    transforms: [],
    outputs: [
      {
        id: `output:${slug}.html`,
        path: `${slug}.html`,
        kind: "content",
        producer: `content:${slug}`,
        dependencies: [{ type: "content", slug }],
        status: "generated",
        evidence: "deterministic",
        recomputeReason: { type: "new-output" },
      },
    ],
  };
}

test("inspect provenance filters and compares shared persisted state", async () => {
  const root = await makeContentRoot();
  const config: ResolvedRiebeckiteConfig = {
    ...baseConfig,
    content: { ...baseConfig.content, directory: root },
    provenance: { enabled: true },
  };
  const project = await makeProject(root);
  project.config = config;
  const first = provenance("a".repeat(64), "a");
  const second = provenance("b".repeat(64), "b");
  const statePath = resolveContentBuildStatePath(config, undefined);
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(
    statePath,
    JSON.stringify({
      version: CONTENT_BUILD_STATE_VERSION,
      entries: {},
      contentIndex: {},
      externalDependencies: [],
      provenance: second,
      provenanceHistory: [first, second],
    }),
  );

  const all = await collectProvenanceInspection(project);
  assert.equal(all.status, "available");
  assert.equal(all.status === "available" && all.history.length, 2);

  const filtered = await collectProvenanceInspection(project, {
    source: "b.md",
    output: "b.html",
    compare: first.buildId,
  });
  assert.equal(filtered.status, "available");
  if (filtered.status !== "available") return;
  assert.deepEqual(
    filtered.provenance.sources.map((source) => source.path),
    ["b.md"],
  );
  assert.deepEqual(
    filtered.provenance.outputs.map((output) => output.path),
    ["b.html"],
  );
  assert.deepEqual(filtered.comparison?.sources.added, ["source:b.md"]);
  assert.deepEqual(filtered.comparison?.sources.removed, ["source:a.md"]);

  const unknown = await collectProvenanceInspection(project, {
    compare: "c".repeat(64),
  });
  assert.equal(
    unknown.status === "available" && unknown.comparisonUnavailable,
    "compare build was not found in history",
  );

  await fs.writeFile(statePath, "{", "utf8");
  assert.deepEqual(await collectProvenanceInspection(project), {
    status: "unavailable",
    reason: "no valid build state",
  });
});

test("inspect provenance reports disabled and missing state", async () => {
  const root = await makeContentRoot();
  const config: ResolvedRiebeckiteConfig = {
    ...baseConfig,
    content: { ...baseConfig.content, directory: root },
  };
  const project = await makeProject(root);
  project.config = config;
  assert.deepEqual(await collectProvenanceInspection(project), {
    status: "unavailable",
    reason: "no valid build state",
  });

  const statePath = resolveContentBuildStatePath(config, undefined);
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(
    statePath,
    JSON.stringify({
      version: CONTENT_BUILD_STATE_VERSION,
      entries: {},
      contentIndex: {},
      externalDependencies: [],
    }),
  );
  assert.deepEqual(await collectProvenanceInspection(project), {
    status: "unavailable",
    reason: "provenance was not recorded",
  });
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
      version: CONTENT_BUILD_STATE_VERSION,
      entries: {},
      contentIndex: {},
      externalDependencies: [],
      pipelineFingerprint: computePipelineFingerprint(config),
    }),
  );

  const inspection = await collectBuildInspection(config);
  assert.equal(inspection.status, "valid");
  assert.equal(inspection.status === "valid" && inspection.reusable, true);
});

test("inspect build reports reuse as unavailable when a content transform bypasses the cache", async () => {
  const root = await makeContentRoot();
  const config: ResolvedRiebeckiteConfig = {
    ...baseConfig,
    content: { ...baseConfig.content, directory: root },
    plugins: [
      {
        name: "unsafe-transformer",
        extendMarkdownPipeline: () => undefined,
      },
    ],
  };
  const statePath = resolveContentBuildStatePath(config, undefined);
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(
    statePath,
    JSON.stringify({
      version: CONTENT_BUILD_STATE_VERSION,
      entries: {},
      contentIndex: {},
      externalDependencies: [],
      pipelineFingerprint: computePipelineFingerprint(config),
    }),
  );

  const inspection = await collectBuildInspection(config);
  assert.equal(inspection.status === "valid" && inspection.reusable, false);
});
