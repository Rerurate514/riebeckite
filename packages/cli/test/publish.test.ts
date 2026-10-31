import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  type ContentSource,
  createPublicationPlan,
  defineDerivedView,
  definePlugin,
  parsePublicationApprovals,
  publicationEntriesFromManifest,
  resolveConfig,
  validatePublicationArtifact,
} from "@riebeckite/core";
import type { RiebeckiteProject } from "../src/application_root.js";
import { writeBuildOutputMarker } from "../src/build_output.js";
import { parseCommand } from "../src/cli.js";
import { runClean } from "../src/commands/clean.js";
import { runPublish } from "../src/commands/publish.js";
import { readPublicationArtifact } from "../src/publication/artifact.js";
import {
  detectProjectHostingProvider,
  planHostingDeployment,
} from "../src/publication/hosting.js";
import { inspectPublication } from "../src/publication/inspection.js";
import {
  acquirePublicationLock,
  readPublicationHistory,
  readPublicationLock,
  readPublicationState,
  releasePublicationLock,
  resolvePublicationApprovalPath,
  resolvePublicationDurableStatePath,
  resolvePublicationHistoryPath,
  resolvePublicationLockPath,
  writePublicationHistory,
} from "../src/publication/state.js";
import { runWranglerDeployment } from "../src/publication/wrangler.js";

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

function makeProject(
  root: string,
  source: ContentSource,
  publication?: { requireApproval?: boolean; approvalFile?: string },
  plugins: Parameters<typeof definePlugin>[0][] = [],
): RiebeckiteProject {
  const config = resolveConfig({
    site: { title: "Test", baseUrl: "https://example.com" },
    content: { source },
    ...(publication === undefined ? {} : { publication }),
    ...(plugins.length === 0 ? {} : { plugins }),
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
  action:
    | "plan"
    | "status"
    | "validate"
    | "run"
    | "approve"
    | "revoke"
    | "record"
    | "gate",
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

  const durable = JSON.parse(
    await fs.readFile(resolvePublicationDurableStatePath(project), "utf8"),
  ) as { lastSuccess?: { publicationFingerprint?: string } };
  assert.equal(
    durable.lastSuccess?.publicationFingerprint,
    plan.publicationFingerprint,
  );

  const next = await inspectPublication(project, {
    provider: "cloudflare-workers",
    workflow: "direct",
  });
  assert.equal(next.plan.action, "none");
  assert.equal(next.plan.changes.detected, false);

  await writeBuildOutputMarker(project, {
    publicationFingerprint: plan.publicationFingerprint,
    completedAt: "2020-01-01T00:00:00.000Z",
  });
  await assert.rejects(
    runPublish(project, options("record", { provider: "cloudflare-workers" })),
    /newer than the build output/,
  );
});

test("corrupt local state files recover instead of wedging publication", async (t) => {
  const root = await makeRoot();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const project = makeProject(root, memorySource({}));
  await fs.mkdir(path.dirname(resolvePublicationHistoryPath(project)), {
    recursive: true,
  });
  await fs.writeFile(resolvePublicationHistoryPath(project), "{truncated");
  assert.deepEqual(await readPublicationHistory(project), {
    version: 1,
    runs: [],
  });

  await fs.mkdir(path.dirname(resolvePublicationDurableStatePath(project)), {
    recursive: true,
  });
  await fs.writeFile(resolvePublicationDurableStatePath(project), "{truncated");
  assert.deepEqual(await readPublicationState(project), { version: 1 });

  const lockPath = path.join(
    path.dirname(resolvePublicationHistoryPath(project)),
    "lock.json",
  );
  await fs.writeFile(lockPath, "{truncated");
  const lock = await acquirePublicationLock(project, "fingerprint");
  assert.equal((await readPublicationLock(project))?.id, lock.id);
  await releasePublicationLock(project, lock);
});

test("a stale heartbeat releases a reused PID but a heartbeating live owner keeps the lock", async (t) => {
  const root = await makeRoot();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const project = makeProject(root, memorySource({}));
  const lockPath = resolvePublicationLockPath(project);
  await fs.mkdir(path.dirname(lockPath), { recursive: true });
  await fs.writeFile(
    lockPath,
    JSON.stringify({
      id: "stale",
      pid: process.pid,
      hostname: os.hostname(),
      startedAt: "2020-01-01T00:00:00.000Z",
      heartbeatAt: "2020-01-01T00:00:00.000Z",
      planFingerprint: "old",
    }),
  );
  const lock = await acquirePublicationLock(project, "fingerprint");
  assert.notEqual(lock.id, "stale");
  await assert.rejects(
    acquirePublicationLock(project, "other"),
    /held the lock/,
  );
  await releasePublicationLock(project, lock);
});

test("durable state stays at the config root when the app lives in a subdirectory", async (t) => {
  const root = await makeRoot();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const project = makeProject(root, memorySource({}));
  const moved = {
    ...project,
    appRoot: path.join(root, "apps", "web"),
  };
  assert.equal(
    resolvePublicationDurableStatePath(moved),
    path.join(root, "publication", "state.json"),
  );
});

test("approval requirement blocks the shared deploy gate until approval and artifact are current", async (t) => {
  const root = await makeRoot();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const source = memorySource({
    "public.md": "---\npublish: true\n---\n\nPublic.\n",
  });
  const project = makeProject(root, source, { requireApproval: true });

  assert.equal(
    await silently(() => runPublish(project, options("gate"))),
    false,
  );

  assert.equal(
    await silently(() =>
      runPublish(project, options("approve", { all: true })),
    ),
    true,
  );

  const inspection = await inspectPublication(project, {
    provider: "cloudflare-workers",
    workflow: "approved",
  });
  await fs.mkdir(path.join(root, "dist"), { recursive: true });
  await fs.writeFile(path.join(root, "dist", "index.html"), "<html></html>");
  await writeBuildOutputMarker(project, {
    publicationFingerprint: inspection.plan.publicationFingerprint,
    completedAt: BUILD_TIME,
  });
  assert.equal(
    await silently(() => runPublish(project, options("gate"))),
    true,
  );

  assert.equal(
    await silently(() =>
      runPublish(project, options("revoke", { slugs: ["public"] })),
    ),
    true,
  );
  assert.equal(
    await silently(() => runPublish(project, options("gate"))),
    false,
  );
});

test("clean --all refuses to remove state while a publication run holds the lock", async (t) => {
  const root = await makeRoot();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const project = makeProject(root, memorySource({}));
  const lock = await acquirePublicationLock(project, "fingerprint");
  await assert.rejects(
    runClean(project, { scope: "all" }),
    /publication run is active/,
  );
  await releasePublicationLock(project, lock);
  await runClean(project, { scope: "all" });
});

test("Cloudflare deployment execution uses the shared gate", async (t) => {
  const root = await makeRoot();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const project = makeProject(
    root,
    memorySource({ "public.md": "---\npublish: true\n---\n\nPublic.\n" }),
    { requireApproval: true },
  );
  const inspection = await inspectPublication(project, {
    provider: "cloudflare-workers",
    workflow: "approved",
  });
  await fs.mkdir(path.join(root, "dist"), { recursive: true });
  await fs.writeFile(path.join(root, "dist", "index.html"), "<html></html>");
  await writeBuildOutputMarker(project, {
    publicationFingerprint: inspection.plan.publicationFingerprint,
    completedAt: BUILD_TIME,
  });
  await assert.rejects(
    runWranglerDeployment(project, {
      provider: "cloudflare-workers",
      dryRun: true,
    }),
    /Publication gate blocked/,
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

test("derived generated outputs gate deployment against the current build marker", async (t) => {
  const root = await makeRoot();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  let label = "first";
  const view = defineDerivedView<string, { label: string; slugs: string[] }>({
    id: "test.publication-index",
    version: "1",
    compute(_input, context) {
      return {
        label,
        slugs: context
          .query("public", { pool: "routable", sort: { field: "slug" } })
          .map((entry) => entry.slug),
      };
    },
  });
  const plugin = definePlugin({
    name: "combined-publication-index",
    derivedViews: [view],
    async planGeneratedOutputs({ derived }) {
      const resolved = await derived.resolveWithDependencies(view, label);
      return [
        {
          path: "derived/public-index.json",
          content: JSON.stringify(resolved.value),
          derivedViewIds: [view.id],
          derivedDependencies: resolved.dependencies,
        },
      ];
    },
  });
  const project = makeProject(
    root,
    memorySource({ "public.md": "---\npublish: true\n---\n\nPublic.\n" }),
    undefined,
    [plugin],
  );

  const inspection = await inspectPublication(project, {
    workflow: "direct",
    at: BUILD_TIME,
  });
  assert.equal(inspection.plan.deploy, true);
  await fs.mkdir(path.join(root, "dist"), { recursive: true });
  await fs.writeFile(path.join(root, "dist", "index.html"), "<html></html>");
  await writeBuildOutputMarker(project, {
    publicationFingerprint: inspection.plan.publicationFingerprint,
    completedAt: BUILD_TIME,
  });
  assert.equal(
    await silently(() => runPublish(project, options("gate"))),
    true,
  );

  label = "second";
  const changed = await inspectPublication(project, {
    workflow: "direct",
    at: BUILD_TIME,
  });
  assert.notEqual(
    changed.plan.publicationFingerprint,
    inspection.plan.publicationFingerprint,
  );
  assert.equal(changed.plan.deploy, true);
  assert.equal(
    await silently(() => runPublish(project, options("gate"))),
    false,
  );
});
