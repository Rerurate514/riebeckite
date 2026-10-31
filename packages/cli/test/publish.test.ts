import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  type ContentSource,
  createPublicationPlan,
  parsePublicationApprovals,
  publicationEntriesFromManifest,
  resolveConfig,
  validatePublicationArtifact,
} from "@riebeckite/core";
import type { RiebeckiteProject } from "../src/application_root.js";
import { parseCommand } from "../src/cli.js";
import { runPublish } from "../src/commands/publish.js";
import { readPublicationArtifact } from "../src/publication/artifact.js";
import {
  detectProjectHostingProvider,
  planHostingDeployment,
} from "../src/publication/hosting.js";
import {
  acquirePublicationLock,
  readPublicationHistory,
  readPublicationLock,
  releasePublicationLock,
  resolvePublicationApprovalPath,
  resolvePublicationHistoryPath,
  writePublicationHistory,
} from "../src/publication/state.js";

const BUILD_TIME = "2026-01-10T00:00:00.000Z";

function memorySource(files: Record<string, string>): ContentSource {
  return {
    async scan() {
      return Object.keys(files).map((file) => ({ path: file }));
    },
    async read(entry) {
      return files[entry.path] ?? "";
    },
  };
}

async function makeRoot(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "riebeckite-publish-cli-"));
}

function makeProject(root: string, source: ContentSource): RiebeckiteProject {
  const config = resolveConfig({
    site: { title: "Test", baseUrl: "https://example.com" },
    content: { source },
  });
  return {
    invocationCwd: root,
    projectRoot: root,
    configRoot: root,
    configPath: path.join(root, "riebeckite.config.ts"),
    appRoot: root,
    contentRoot: path.join(root, "content"),
    config: {
      ...config,
      buildDirectory: path.join(root, ".riebeckite"),
      outputDirectory: path.join(root, "dist"),
    },
  };
}

function options(
  action: "plan" | "status" | "validate" | "run" | "approve" | "record",
  overrides: Partial<Parameters<typeof runPublish>[1]> = {},
): Parameters<typeof runPublish>[1] {
  return {
    action,
    json: false,
    at: BUILD_TIME,
    workflow: "direct",
    execute: false,
    force: false,
    trigger: "cli",
    slugs: [],
    all: false,
    ...overrides,
  };
}

async function silently<T>(run: () => Promise<T>): Promise<T> {
  const log = console.log;
  console.log = () => undefined;
  try {
    return await run();
  } finally {
    console.log = log;
  }
}

test("publish CLI syntax is parsed explicitly", () => {
  assert.deepEqual(parseCommand(["publish", "plan", "--json"]), {
    name: "publish",
    options: {
      action: "plan",
      json: true,
      workflow: "direct",
      execute: false,
      force: false,
      trigger: "cli",
      slugs: [],
      all: false,
    },
  });
  assert.deepEqual(
    parseCommand([
      "publish",
      "run",
      "--execute",
      "--require-approval",
      "--trigger",
      "scheduled",
      "--provider",
      "github-pages",
    ]),
    {
      name: "publish",
      options: {
        action: "run",
        json: false,
        workflow: "approved",
        execute: true,
        force: false,
        trigger: "scheduled",
        provider: "github-pages",
        slugs: [],
        all: false,
      },
    },
  );
  assert.throws(() => parseCommand(["publish", "run", "--all"]));
  assert.throws(() => parseCommand(["publish", "approve"]));
});

test("authorization and history live outside the build cache and round-trip", async (t) => {
  const root = await makeRoot();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const project = makeProject(root, memorySource({}));
  const approvalsFile = resolvePublicationApprovalPath(project);
  assert.equal(approvalsFile, path.join(root, "publication", "approvals.json"));
  assert.equal(
    resolvePublicationHistoryPath(project),
    path.join(root, ".riebeckite", "publication", "history.json"),
  );

  const history = await readPublicationHistory(project);
  assert.deepEqual(history.runs, []);
  await writePublicationHistory(project, { ...history, runs: [] });
  assert.deepEqual(await readPublicationHistory(project), history);

  const lock = await acquirePublicationLock(project, "fingerprint");
  assert.equal((await readPublicationLock(project))?.id, lock.id);
  await assert.rejects(
    acquirePublicationLock(project, "other"),
    /held the lock/,
  );
  await releasePublicationLock(project, lock);
  assert.equal(await readPublicationLock(project), undefined);
});

test("hosting detection prefers wrangler and can plan each provider", async (t) => {
  const root = await makeRoot();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const project = makeProject(root, memorySource({}));
  await fs.writeFile(path.join(root, "wrangler.jsonc"), "{}\n");
  assert.equal(
    await detectProjectHostingProvider(project),
    "cloudflare-workers",
  );
  assert.equal(
    (await planHostingDeployment(project, "cloudflare-workers")).kind,
    "command",
  );
  assert.equal(
    (await planHostingDeployment(project, "github-pages")).kind,
    "ci",
  );

  await fs.rm(path.join(root, "wrangler.jsonc"));
  await fs.mkdir(path.join(root, ".github", "workflows"), { recursive: true });
  await fs.writeFile(
    path.join(root, ".github", "workflows", "pages.yml"),
    "uses: actions/deploy-pages@v4\n",
  );
  assert.equal(await detectProjectHostingProvider(project), "github-pages");
});

test("plan, approve, status, and validate follow the workflow boundary", async (t) => {
  const root = await makeRoot();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const source = memorySource({
    "public.md": "---\npublish: true\n---\n\nPublic.\n",
    "unlisted.md": "---\nvisibility: unlisted\n---\n\nUnlisted.\n",
    "draft.md": "---\npublish: false\n---\n\nDraft.\n",
    "later.md":
      "---\npublish: true\npublishAt: 2026-01-11T00:00:00.000Z\n---\n\nLater.\n",
  });
  const project = makeProject(root, source);

  assert.equal(
    await silently(() => runPublish(project, options("plan"))),
    true,
  );
  assert.equal(
    await silently(() => runPublish(project, options("status"))),
    true,
  );

  assert.equal(
    await silently(() =>
      runPublish(
        project,
        options("approve", { slugs: ["public", "unlisted", "later"] }),
      ),
    ),
    true,
  );
  const stored = JSON.parse(
    await fs.readFile(resolvePublicationApprovalPath(project), "utf8"),
  );
  assert.ok(parsePublicationApprovals(stored));
  assert.deepEqual(Object.keys(stored.approvals).sort(), [
    "later",
    "public",
    "unlisted",
  ]);

  assert.equal(
    await silently(() =>
      runPublish(project, options("plan", { workflow: "approved" })),
    ),
    true,
  );

  assert.equal(
    await silently(() => runPublish(project, options("validate"))),
    false,
  );

  const manifest = await (
    await import("../src/publication/manifest.js")
  ).loadPublicationManifest(project, new Date(BUILD_TIME));
  const entries = publicationEntriesFromManifest(manifest);
  const plan = createPublicationPlan({
    buildTime: BUILD_TIME,
    entries,
    generatedAt: BUILD_TIME,
  });
  await fs.mkdir(path.join(root, "dist"), { recursive: true });
  await fs.writeFile(path.join(root, "dist", "index.html"), "<html></html>");
  const artifact = await readPublicationArtifact(project);
  assert.ok(
    validatePublicationArtifact({
      plan,
      artifact: { ...artifact, markerPublicationFingerprint: "stale" },
    }).some((issue) => issue.code === "artifact-stale"),
  );
});

test("publish run without --execute never builds or deploys", async (t) => {
  const root = await makeRoot();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const project = makeProject(
    root,
    memorySource({ "public.md": "---\npublish: true\n---\n\nPublic.\n" }),
  );
  assert.equal(await silently(() => runPublish(project, options("run"))), true);
  assert.equal(
    await readPublicationHistory(project).then((h) => h.runs.length),
    0,
  );
  await assert.rejects(fs.stat(path.join(root, "dist")));
});

test("publish record closes the loop for an external CI deployment", async (t) => {
  const root = await makeRoot();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const project = makeProject(
    root,
    memorySource({ "public.md": "---\npublish: true\n---\n\nPublic.\n" }),
  );
  const { loadPublicationManifest } = await import(
    "../src/publication/manifest.js"
  );
  const manifest = await loadPublicationManifest(project, new Date(BUILD_TIME));
  const plan = createPublicationPlan({
    buildTime: BUILD_TIME,
    entries: publicationEntriesFromManifest(manifest),
    generatedAt: BUILD_TIME,
  });
  await fs.mkdir(path.join(root, "dist"), { recursive: true });
  await fs.writeFile(path.join(root, "dist", "index.html"), "<html></html>");
  const { writeBuildOutputMarker } = await import("../src/build_output.js");
  await writeBuildOutputMarker(project, {
    publicationFingerprint: plan.publicationFingerprint,
    completedAt: BUILD_TIME,
  });

  assert.equal(
    await silently(() =>
      runPublish(
        project,
        options("record", { provider: "cloudflare-workers" }),
      ),
    ),
    true,
  );
  const history = await readPublicationHistory(project);
  assert.equal(history.runs[0]?.status, "deployed");
  assert.equal(
    history.lastSuccess?.publicationFingerprint,
    plan.publicationFingerprint,
  );
});

test("publish plan --json emits only parseable JSON", async (t) => {
  const root = await makeRoot();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const project = makeProject(
    root,
    memorySource({ "public.md": "---\npublish: true\n---\n\nPublic.\n" }),
  );
  const output: string[] = [];
  const log = console.log;
  console.log = (value: unknown) => output.push(String(value));
  try {
    await runPublish(project, options("plan", { json: true }));
  } finally {
    console.log = log;
  }
  const parsed = JSON.parse(output.join("\n")) as {
    command: string;
    plan: { targets: { public: unknown[] }; action: string };
    provider: string | undefined;
  };
  assert.equal(parsed.command, "plan");
  assert.equal(parsed.plan.targets.public.length, 1);
  assert.equal(parsed.plan.action, "build-and-deploy");
});
