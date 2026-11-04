import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { CompletedContentBuildSnapshot } from "@riebeckite/core";
import type { ViteDevServer } from "vite";
import { riebeckiteBridge } from "../src/bridge.js";
import {
  inspectBridgeImpact,
  inspectBridgePage,
  inspectBridgePreview,
  inspectBridgePublication,
  resolveBridgeSource,
} from "../src/bridge_inspection.js";
import { approveBridgeMutationPlan } from "../src/bridge_mutation.js";

const token = "a".repeat(32);
const mutationToken = "m".repeat(32);
const approvalToken = "p".repeat(32);

test("serves authenticated status from its private loopback listener", async (t) => {
  const { bootstrap, close } = bridge();
  t.after(close);

  const boot = await callBootstrap(bootstrap, {
    host: "127.0.0.1:3000",
    token,
  });
  assert.equal(boot.statusCode, 200);
  const { origin } = JSON.parse(boot.body) as { origin: string };

  const response = await fetch(`${origin}/__riebeckite/bridge/v1`, {
    headers: {
      "x-riebeckite-bridge-token": token,
      "x-riebeckite-bridge-protocol": "1",
    },
  });
  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    server: { id: string };
    protocolVersion: number;
    capabilities: string[];
    development: unknown;
    inspection: unknown;
  };
  assert.match(body.server.id, /^[0-9a-f-]{36}$/);
  assert.deepEqual(
    { ...body, server: { version: "0.0.38" } },
    {
      protocolVersion: 1,
      server: { version: "0.0.38" },
      capabilities: ["status", "page-resolution"],
      development: {
        available: true,
        revision: 0,
        build: { status: "unavailable" },
      },
      inspection: { available: false },
    },
  );
});

test("advertises inspection capabilities when a content root is supplied", async (t) => {
  const { bootstrap, close } = bridge({ contentRoot: "/vault" });
  t.after(close);
  const { origin } = await bootstrapOrigin(bootstrap);
  const response = await bridgeRequest(origin, "/__riebeckite/bridge/v1");
  assert.equal(response.status, 200);
  const body = (await response.json()) as { capabilities: string[] };
  assert.deepEqual(body.capabilities, [
    "status",
    "source-resolution",
    "page-resolution",
    "preview",
    "events",
    "diagnostics",
    "publication",
    "build-impact",
  ]);
});

test("rejects invalid pairings and incompatible protocols", async (t) => {
  const { bootstrap, close } = bridge();
  t.after(close);

  const rejected = await callBootstrap(bootstrap, {
    host: "127.0.0.1:3000",
    token: "wrong",
  });
  assert.equal(rejected.statusCode, 403);

  const { origin } = await bootstrapOrigin(bootstrap);
  const response = await fetch(`${origin}/__riebeckite/bridge/v1`, {
    headers: {
      "x-riebeckite-bridge-token": token,
      "x-riebeckite-bridge-protocol": "2",
    },
  });
  assert.equal(response.status, 426);
  assert.deepEqual(await response.json(), {
    code: "INCOMPATIBLE_PROTOCOL",
    supportedProtocolVersions: [1],
  });
});

test("does not enable the Bridge with a short token", () => {
  const plugin = riebeckiteBridge({
    token: "short",
    getSnapshot: () => undefined,
  });
  const configure = plugin.configureServer as (server: ViteDevServer) => void;
  assert.equal(typeof configure, "function");
  const stack: unknown[] = [];
  configure({
    middlewares: { use: (...arguments_) => stack.push(arguments_) },
  } as unknown as ViteDevServer);
  assert.deepEqual(stack, []);
});

test("rejects forwarded and cross-origin private requests", async (t) => {
  const { bootstrap, close } = bridge();
  t.after(close);
  const { origin } = await bootstrapOrigin(bootstrap);

  for (const headers of [
    { origin: "http://127.0.0.1:3000" },
    { "x-forwarded-for": "127.0.0.1" },
  ]) {
    const response = await fetch(`${origin}/__riebeckite/bridge/v1`, {
      headers: { "x-riebeckite-bridge-token": token, ...headers },
    });
    assert.equal(response.status, 403);
  }
});

test("rejects unsupported methods and unknown paths", async (t) => {
  const { bootstrap, close } = bridge();
  t.after(close);
  const { origin } = await bootstrapOrigin(bootstrap);

  const post = await fetch(`${origin}/__riebeckite/bridge/v1`, {
    method: "POST",
    headers: {
      "x-riebeckite-bridge-token": token,
      "x-riebeckite-bridge-protocol": "1",
    },
  });
  assert.equal(post.status, 405);
  const unknown = await bridgeRequest(origin, "/__riebeckite/bridge/v1/nope");
  assert.equal(unknown.status, 404);
});

test("resolves a public page through the Obsidian page endpoint", async (t) => {
  const { bootstrap, close } = bridge({
    publicOrigin: "https://example.com",
    getSnapshot: fixtureSnapshot,
  });
  t.after(close);
  const { origin } = await bootstrapOrigin(bootstrap);

  const response = await bridgeRequest(
    origin,
    "/__riebeckite/bridge/v1/page?source=notes%2Fhello.md",
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: "resolved",
    source: "notes/hello.md",
    page: "/ja/hello/",
    visibility: "public",
    routable: true,
    discoverable: true,
    locale: "ja",
    publishAt: null,
    revision: 0,
    productionUrl: "https://example.com/ja/hello/",
  });
});

test("never reports a draft as public and never infers a production URL", async (t) => {
  const { bootstrap, close } = bridge({ getSnapshot: fixtureSnapshot });
  t.after(close);
  const { origin } = await bootstrapOrigin(bootstrap);

  const response = await bridgeRequest(
    origin,
    "/__riebeckite/bridge/v1/page?source=notes%2Fdraft.md",
  );
  assert.deepEqual(await response.json(), {
    status: "resolved",
    source: "notes/draft.md",
    page: "/ja/draft/",
    visibility: "draft",
    routable: false,
    discoverable: false,
    locale: "ja",
    publishAt: "2026-11-05T00:00:00.000Z",
    revision: 0,
    productionUrl: null,
  });
});

test("distinguishes an unavailable manifest from a missing page", async (t) => {
  const unavailable = bridge();
  t.after(unavailable.close);
  const { origin: unavailableOrigin } = await bootstrapOrigin(
    unavailable.bootstrap,
  );
  assert.deepEqual(
    await (
      await bridgeRequest(
        unavailableOrigin,
        "/__riebeckite/bridge/v1/page?source=notes%2Fhello.md",
      )
    ).json(),
    { status: "unavailable" },
  );

  const ready = bridge({ getSnapshot: fixtureSnapshot });
  t.after(ready.close);
  const { origin: readyOrigin } = await bootstrapOrigin(ready.bootstrap);
  const missing = await bridgeRequest(
    readyOrigin,
    "/__riebeckite/bridge/v1/page?source=notes%2Fmissing.md",
  );
  assert.deepEqual(await missing.json(), {
    status: "not-found",
    source: "notes/missing.md",
  });
});

test("rejects invalid page sources and reports ambiguous sources honestly", async (t) => {
  const { bootstrap, close } = bridge({ getSnapshot: fixtureSnapshot });
  t.after(close);
  const { origin } = await bootstrapOrigin(bootstrap);

  for (const source of ["..%2Fsecret.md", "%2Fetc%2Fpasswd.md", ""]) {
    const response = await bridgeRequest(
      origin,
      `/__riebeckite/bridge/v1/page?source=${source}`,
    );
    assert.deepEqual(await response.json(), { status: "invalid-source" });
  }
  const ambiguous = await bridgeRequest(
    origin,
    "/__riebeckite/bridge/v1/page?source=shared.md",
  );
  assert.deepEqual(await ambiguous.json(), {
    status: "unsupported",
    source: "shared.md",
    reason: "AMBIGUOUS_SOURCE",
    candidates: ["a/shared", "b/shared"],
  });
});

test("resolves the same source through both page and source endpoints", async (t) => {
  const { bootstrap, close } = bridge({
    contentRoot: "/vault",
    publicOrigin: "https://example.com",
    getSnapshot: fixtureSnapshot,
  });
  t.after(close);
  const { origin } = await bootstrapOrigin(bootstrap);

  const page = (await (
    await bridgeRequest(
      origin,
      "/__riebeckite/bridge/v1/page?source=notes%2Fhello.md",
    )
  ).json()) as Record<string, unknown>;
  const source = (await (
    await bridgeRequest(
      origin,
      "/__riebeckite/bridge/v1/source?path=notes%2Fhello.md",
    )
  ).json()) as { entry: Record<string, unknown>; revision: number };

  assert.equal(page.status, "resolved");
  assert.equal(page.page, source.entry.permalink);
  assert.equal(page.visibility, source.entry.visibility);
  assert.equal(page.routable, source.entry.routable);
  assert.equal(page.locale, source.entry.locale);
  assert.equal(page.revision, source.revision);
});

test("resolves a suffix and a content ID through the shared source resolution", () => {
  const snapshot = fixtureSnapshot();
  const options = {
    contentRoot: "/vault",
    revision: 4,
    developmentOrigin: "http://127.0.0.1:5173/",
  };
  assert.deepEqual(
    resolveBridgeSource(snapshot, "/vault/notes/hello.md", options),
    {
      status: "resolved",
      entry: {
        slug: "notes/hello",
        contentId: "hello-id",
        source: { path: "notes/hello.md" },
        permalink: "/ja/hello/",
        locale: "ja",
        visibility: "public",
        routable: true,
        discoverable: true,
        redirects: [],
      },
      revision: 4,
    },
  );
  assert.equal(
    (
      resolveBridgeSource(snapshot, "hello.md", options).entry as {
        slug: string;
      }
    ).slug,
    "notes/hello",
  );
  assert.equal(
    (
      resolveBridgeSource(snapshot, "hello-id", options).entry as {
        slug: string;
      }
    ).slug,
    "notes/hello",
  );
  assert.deepEqual(resolveBridgeSource(snapshot, "../secret.md", options), {
    status: "unsupported",
    reason: "INVALID_SOURCE_PATH",
    revision: 4,
  });
});

test("does not offer a preview for non-routable pages", () => {
  const snapshot = fixtureSnapshot();
  const options = {
    contentRoot: "/vault",
    revision: 4,
    developmentOrigin: "http://127.0.0.1:5173/",
    publicOrigin: "https://example.com",
  };
  assert.deepEqual(
    inspectBridgePreview(snapshot, "notes/hello.md", options).preview,
    {
      available: true,
      developmentUrl: "http://127.0.0.1:5173/ja/hello/",
      productionUrl: "https://example.com/ja/hello/",
    },
  );
  assert.deepEqual(
    inspectBridgePreview(snapshot, "notes/draft.md", options).preview,
    {
      available: false,
      reason: "NOT_PUBLICLY_ROUTABLE",
    },
  );
  assert.deepEqual(
    inspectBridgePreview(snapshot, "notes/hello.md", {
      ...options,
      developmentOrigin: undefined,
    }).preview,
    { available: false, reason: "DEVELOPMENT_SERVER_URL_UNAVAILABLE" },
  );
});

test("reports publication state without treating drafts as routable", () => {
  const snapshot = fixtureSnapshot();
  const options = { contentRoot: "/vault", revision: 4 };
  const draft = inspectBridgePublication(snapshot, "notes/draft.md", options)
    .publication as Record<string, unknown>;
  assert.equal(draft.visibility, "draft");
  assert.equal(draft.routable, false);
  assert.deepEqual(draft.reasons, ["visibility is draft"]);
  const page = inspectBridgePage(snapshot, "notes/hello.md", options);
  assert.equal(page.visibility, "public");
  assert.equal(page.routable, true);
});

test("returns content diagnostics and last-build impact", () => {
  const snapshot = fixtureSnapshot();
  const options = { contentRoot: "/vault", revision: 4 };
  const diagnostics = resolveBridgeSource(snapshot, "notes/hello.md", options);
  assert.equal(diagnostics.status, "resolved");
  assert.deepEqual(
    inspectBridgePreview(snapshot, "notes/hello.md", {
      ...options,
      developmentOrigin: "http://127.0.0.1:5173/",
    }).preview,
    {
      available: true,
      developmentUrl: "http://127.0.0.1:5173/ja/hello/",
      productionUrl: null,
    },
  );
  assert.equal(
    (
      inspectBridgeImpact(snapshot, "notes/hello.md", options).impact as {
        completeness: string;
      }
    ).completeness,
    "complete",
  );
});

test("streams the State and content.changed event schema", async (t) => {
  const { bootstrap, close } = bridge({ getSnapshot: fixtureSnapshot });
  t.after(close);
  const { origin } = await bootstrapOrigin(bootstrap);
  const controller = new AbortController();
  t.after(() => controller.abort());
  const response = await fetch(`${origin}/__riebeckite/bridge/v1/events`, {
    headers: {
      "x-riebeckite-bridge-token": token,
      "x-riebeckite-bridge-protocol": "1",
    },
    signal: controller.signal,
  });
  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /text\/event-stream/,
  );
  const reader = response.body?.getReader();
  assert.ok(reader);
  const first = await reader.read();
  const text = new TextDecoder().decode(first.value);
  assert.match(
    text,
    /^event: state\ndata: \{"revision":0,"build":"ready"\}\n\n$/,
  );
});

test("enforces approved mutation plans through the private HTTP listener", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "riebeckite-bridge-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const first = bridge({
    contentRoot: root,
    mutationToken,
    mutationApprovalToken: approvalToken,
  });
  t.after(first.close);
  const origin = await privateOrigin(first.bootstrap);
  const missing = await mutationApply(origin, "missing-plan");
  assert.equal(missing.status, 409);
  assert.equal(((await missing.json()) as { applied: boolean }).applied, false);
  const plan = await mutationPlan(origin, [
    { kind: "create", path: "notes/hello.md", content: "Hello" },
  ]);
  const rejected = await mutationApply(origin, plan.id);
  assert.equal(rejected.status, 409);
  assert.equal(
    ((await rejected.json()) as { applied: boolean }).applied,
    false,
  );
  const approval = await approveBridgeMutationPlan(
    root,
    plan.id,
    approvalToken,
  );
  assert.ok(approval);
  const applied = await mutationApply(origin, plan.id);
  assert.equal(((await applied.json()) as { applied: boolean }).applied, true);
  const replay = await mutationApply(origin, plan.id);
  assert.equal(replay.status, 409);
  assert.equal(((await replay.json()) as { applied: boolean }).applied, false);
  assert.equal(
    await fs.readFile(path.join(root, "notes/hello.md"), "utf8"),
    "Hello",
  );
});

test("requires distinct mutation and approval tokens", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "riebeckite-bridge-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const instance = bridge({
    contentRoot: root,
    mutationToken,
    mutationApprovalToken: mutationToken,
  });
  t.after(instance.close);
  const response = await fetch(
    `${await privateOrigin(instance.bootstrap)}/__riebeckite/bridge/v1/mutations/plan`,
    {
      method: "POST",
      headers: mutationHeaders(),
      body: JSON.stringify({ operations: [] }),
    },
  );
  assert.equal(response.status, 404);
});

test("rejects mutation endpoints for read-only Bridge clients", async (t) => {
  const { bootstrap, close } = bridge({ contentRoot: "C:/vault" });
  t.after(close);
  const response = await fetch(
    `${await privateOrigin(bootstrap)}/__riebeckite/bridge/v1/mutations/plan`,
    {
      method: "POST",
      headers: mutationHeaders(),
      body: JSON.stringify({ operations: [{ kind: "create" }] }),
    },
  );
  assert.equal(response.status, 404);
});

test("preserves frontmatter objects while persisting mutation plans", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "riebeckite-bridge-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, "notes"));
  await fs.writeFile(
    path.join(root, "notes", "metadata.md"),
    "---\ntitle: Metadata\n---\n",
  );
  const instance = bridge({
    contentRoot: root,
    mutationToken,
    mutationApprovalToken: approvalToken,
  });
  t.after(instance.close);
  const origin = await privateOrigin(instance.bootstrap);
  const plan = await mutationPlan(origin, [
    {
      kind: "frontmatter",
      path: "notes/metadata.md",
      set: { bytes: "preserve" },
    },
  ]);
  assert.ok(await approveBridgeMutationPlan(root, plan.id, approvalToken));
  const applied = await mutationApply(origin, plan.id);
  assert.equal(((await applied.json()) as { applied: boolean }).applied, true);
  assert.match(
    await fs.readFile(path.join(root, "notes", "metadata.md"), "utf8"),
    /bytes: preserve/,
  );
});

test("rejects unsafe and stale mutations through the private HTTP listener", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "riebeckite-bridge-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const instance = bridge({
    contentRoot: root,
    mutationToken,
    mutationApprovalToken: approvalToken,
  });
  t.after(instance.close);
  const origin = await privateOrigin(instance.bootstrap);

  const traversal = await mutationPlan(origin, [
    { kind: "create", path: "../outside.md", content: "no" },
  ]);
  assert.ok(traversal.conflicts.length > 0);
  const csrf = await fetch(`${origin}/__riebeckite/bridge/v1/mutations/plan`, {
    method: "POST",
    headers: { ...mutationHeaders(), origin: "http://localhost:3000" },
    body: JSON.stringify({ operations: [] }),
  });
  assert.equal(csrf.status, 403);
  const huge = await fetch(`${origin}/__riebeckite/bridge/v1/mutations/plan`, {
    method: "POST",
    headers: mutationHeaders(),
    body: JSON.stringify({
      operations: [{ content: "x".repeat(1024 * 1024) }],
    }),
  });
  assert.equal(huge.status, 400);

  const conflictPlan = await mutationPlan(origin, [
    { kind: "create", path: "notes/conflict.md", content: "planned" },
  ]);
  const conflictApproval = await approveBridgeMutationPlan(
    root,
    conflictPlan.id,
    approvalToken,
  );
  assert.ok(conflictApproval);
  await fs.mkdir(path.join(root, "notes"), { recursive: true });
  await fs.writeFile(path.join(root, "notes/conflict.md"), "changed");
  const conflict = await mutationApply(origin, conflictPlan.id);
  assert.equal(conflict.status, 409);
  assert.equal(
    ((await conflict.json()) as { applied: boolean }).applied,
    false,
  );

  const substitutedPlan = await mutationPlan(origin, [
    { kind: "create", path: "notes/substituted.md", content: "planned" },
  ]);
  const substitutedApproval = await approveBridgeMutationPlan(
    root,
    substitutedPlan.id,
    approvalToken,
  );
  assert.ok(substitutedApproval);
  const storedPlanPath = path.join(
    root,
    ".riebeckite",
    "bridge",
    "plans",
    `${substitutedPlan.id}.json`,
  );
  const storedPlan = JSON.parse(await fs.readFile(storedPlanPath, "utf8")) as {
    plan: {
      object: {
        operations: { array: Array<{ object: { content?: string } }> };
      };
    };
  };
  storedPlan.plan.object.operations.array[0].object.content = "substituted";
  await fs.writeFile(storedPlanPath, JSON.stringify(storedPlan));
  const substituted = await mutationApply(origin, substitutedPlan.id);
  assert.equal(
    ((await substituted.json()) as { applied: boolean }).applied,
    false,
  );

  const outside = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-outside-"),
  );
  t.after(() => fs.rm(outside, { recursive: true, force: true }));
  try {
    await fs.symlink(outside, path.join(root, "linked"), "junction");
    const escaped = await mutationPlan(origin, [
      { kind: "create", path: "linked/escape.md", content: "no" },
    ]);
    const escapedApproval = await approveBridgeMutationPlan(
      root,
      escaped.id,
      approvalToken,
    );
    assert.ok(escapedApproval);
    const escapedApply = await mutationApply(origin, escaped.id);
    assert.equal(
      ((await escapedApply.json()) as { applied: boolean }).applied,
      false,
    );
    await assert.rejects(fs.access(path.join(outside, "escape.md")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EPERM") throw error;
  }

  const parallelPlan = await mutationPlan(origin, [
    { kind: "create", path: "notes/parallel.md", content: "ok" },
  ]);
  const parallelApproval = await approveBridgeMutationPlan(
    root,
    parallelPlan.id,
    approvalToken,
  );
  assert.ok(parallelApproval);
  const parallel = await Promise.all([
    mutationApply(origin, parallelPlan.id),
    mutationApply(origin, parallelPlan.id),
  ]);
  assert.deepEqual(
    (await Promise.all(parallel.map(async (response) => response.json())))
      .map((result) => (result as { applied: boolean }).applied)
      .sort(),
    [false, true],
  );

  const expiryPlan = await mutationPlan(origin, [
    { kind: "create", path: "notes/expired.md", content: "no" },
  ]);
  const expiryApproval = await approveBridgeMutationPlan(
    root,
    expiryPlan.id,
    approvalToken,
  );
  assert.ok(expiryApproval);
  const originalNow = Date.now;
  Date.now = () => originalNow() + 6 * 60 * 1000;
  try {
    const expired = await mutationApply(origin, expiryPlan.id);
    assert.equal(
      ((await expired.json()) as { applied: boolean }).applied,
      false,
    );
  } finally {
    Date.now = originalNow;
  }
});

test("does not expose self-approval, recovery, or rollback endpoints", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "riebeckite-bridge-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const first = bridge({
    contentRoot: root,
    mutationToken,
    mutationApprovalToken: approvalToken,
  });
  const firstOrigin = await privateOrigin(first.bootstrap);
  const plan = await mutationPlan(firstOrigin, [
    { kind: "create", path: "notes/restart.md", content: "ok" },
  ]);
  const approval = await approveBridgeMutationPlan(
    root,
    plan.id,
    approvalToken,
  );
  assert.ok(approval);
  first.close();
  const second = bridge({
    contentRoot: root,
    mutationToken,
    mutationApprovalToken: approvalToken,
  });
  t.after(second.close);
  const applied = await mutationApply(
    await privateOrigin(second.bootstrap),
    plan.id,
  );
  assert.equal(((await applied.json()) as { applied: boolean }).applied, true);
  for (const action of ["approve", "recover", "rollback"]) {
    const endpoint = await fetch(
      `${await privateOrigin(second.bootstrap)}/__riebeckite/bridge/v1/mutations/${plan.id}/${action}`,
      { method: "POST", headers: mutationHeaders(), body: "{}" },
    );
    assert.equal(endpoint.status, 404);
  }
});

function fixtureSnapshot(): CompletedContentBuildSnapshot {
  const entry = {
    slug: "notes/hello",
    contentId: "hello-id",
    permalink: "/ja/hello/",
    publicLocation: {
      slug: "notes/hello",
      permalink: "/ja/hello/",
      language: "ja",
      redirects: [],
    },
    title: "Hello",
    frontmatter: {},
    publishing: {
      visibility: "public",
      routable: true,
      discoverable: true,
    },
    html: "",
    tags: [],
    links: [],
    backlinks: [],
    assets: [],
  };
  const draft = {
    ...entry,
    slug: "notes/draft",
    contentId: "draft-id",
    permalink: "/ja/draft/",
    publicLocation: {
      slug: "notes/draft",
      permalink: "/ja/draft/",
      language: "ja",
      redirects: [],
    },
    publishing: {
      visibility: "draft",
      routable: false,
      discoverable: false,
      publishAt: new Date("2026-11-05T00:00:00.000Z"),
    },
  };
  return {
    completedAt: 42,
    manifest: {
      bySlug: new Map([
        [entry.slug, entry],
        [draft.slug, draft],
      ]),
      byContentId: new Map([[entry.contentId, entry]]),
      byAlias: new Map(),
      byPermalink: new Map([[entry.permalink, entry]]),
      contentIndex: new Map([
        ["notes/hello", "notes/hello"],
        ["hello", "notes/hello"],
        ["notes/draft", "notes/draft"],
      ]),
      contentIndexAmbiguities: new Map([["shared", ["a/shared", "b/shared"]]]),
      redirects: new Map(),
      diagnostics: [],
    },
    finalHtmlDiagnostics: [],
    outputChangeSet: {
      affected: [
        {
          kind: "content",
          path: "ja/hello/index.html",
          producer: "content:notes/hello",
          dependencies: [{ type: "content", slug: "notes/hello" }],
        },
      ],
      unchanged: [],
      removed: [],
      fullRegenerationRequired: false,
      reasons: new Map(),
    },
  } as unknown as CompletedContentBuildSnapshot;
}

function bridge(input?: {
  contentRoot?: string;
  publicOrigin?: string;
  getSnapshot?: () => CompletedContentBuildSnapshot | undefined;
  mutationToken?: string;
  mutationApprovalToken?: string;
}): {
  bootstrap: (request: unknown, response: unknown) => Promise<void>;
  close: () => void;
} {
  const stack: Array<{ route: string; handle: unknown }> = [];
  let close: (() => void) | undefined;
  const plugin = riebeckiteBridge({
    token,
    contentRoot: input?.contentRoot,
    publicOrigin: input?.publicOrigin,
    mutationToken: input?.mutationToken,
    mutationApprovalToken: input?.mutationApprovalToken,
    getSnapshot: input?.getSnapshot ?? (() => undefined),
  });
  const configure = plugin.configureServer as (server: ViteDevServer) => void;
  assert.equal(typeof configure, "function");
  configure({
    middlewares: {
      use: (route: string, handle: unknown) => stack.push({ route, handle }),
    },
    resolvedUrls: { local: ["http://127.0.0.1:5173/"] },
    httpServer: {
      address: () => ({ address: "127.0.0.1" }),
      once: (_event: string, handler: () => void) => (close = handler),
    },
  } as unknown as ViteDevServer);
  const bootstrap = stack.find(
    (layer) => layer.route === "/__riebeckite/bridge/bootstrap",
  )?.handle;
  assert.equal(typeof bootstrap, "function");
  return {
    bootstrap: bootstrap as (
      request: unknown,
      response: unknown,
    ) => Promise<void>,
    close: () => close?.(),
  };
}

async function bootstrapOrigin(
  bootstrap: (request: unknown, response: unknown) => Promise<void>,
): Promise<{ origin: string }> {
  const boot = await callBootstrap(bootstrap, {
    host: "127.0.0.1:3000",
    token,
  });
  assert.equal(boot.statusCode, 200);
  return JSON.parse(boot.body) as { origin: string };
}

function bridgeRequest(origin: string, path: string): Promise<Response> {
  return fetch(`${origin}${path}`, {
    headers: {
      "x-riebeckite-bridge-token": token,
      "x-riebeckite-bridge-protocol": "1",
    },
  });
}

async function privateOrigin(
  bootstrap: (request: unknown, response: unknown) => Promise<void>,
): Promise<string> {
  return (await bootstrapOrigin(bootstrap)).origin;
}

function mutationHeaders(): Record<string, string> {
  return {
    "content-type": "application/json",
    "x-riebeckite-bridge-token": token,
    "x-riebeckite-bridge-protocol": "1",
    "x-riebeckite-bridge-mutation-token": mutationToken,
  };
}

async function mutationPlan(
  origin: string,
  operations: unknown[],
): Promise<{ id: string; conflicts: unknown[] }> {
  const response = await fetch(
    `${origin}/__riebeckite/bridge/v1/mutations/plan`,
    {
      method: "POST",
      headers: mutationHeaders(),
      body: JSON.stringify({ operations }),
    },
  );
  assert.equal(response.status, 200);
  return response.json() as Promise<{ id: string; conflicts: unknown[] }>;
}

function mutationApply(origin: string, planId: string): Promise<Response> {
  return fetch(`${origin}/__riebeckite/bridge/v1/mutations/${planId}/apply`, {
    method: "POST",
    headers: mutationHeaders(),
    body: "{}",
  });
}
async function callBootstrap(
  bootstrap: (request: unknown, response: unknown) => Promise<void>,
  input: { host: string; token: string },
): Promise<{ statusCode: number; body: string }> {
  let body = "";
  const response = {
    statusCode: 200,
    setHeader() {},
    end(value?: string) {
      body = value ?? "";
    },
  };
  await bootstrap(
    {
      method: "GET",
      url: "/__riebeckite/bridge/bootstrap",
      headers: { host: input.host, "x-riebeckite-bridge-token": input.token },
      socket: { remoteAddress: "127.0.0.1" },
    },
    response,
  );
  return { statusCode: response.statusCode, body };
}
