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
      capabilities: ["status"],
      development: {
        available: true,
        revision: 0,
        build: { status: "unavailable" },
      },
      inspection: { available: false },
    },
  );
});

test("rejects invalid pairings and incompatible protocols", async (t) => {
  const { bootstrap, close } = bridge();
  t.after(close);

  const rejected = await callBootstrap(bootstrap, {
    host: "127.0.0.1:3000",
    token: "wrong",
  });
  assert.equal(rejected.statusCode, 403);

  const boot = await callBootstrap(bootstrap, {
    host: "127.0.0.1:3000",
    token,
  });
  const { origin } = JSON.parse(boot.body) as { origin: string };
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
  const boot = await callBootstrap(bootstrap, {
    host: "127.0.0.1:3000",
    token,
  });
  const { origin } = JSON.parse(boot.body) as { origin: string };

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

test("serves a source resolution through the authenticated Bridge endpoint", async (t) => {
  const { bootstrap, close } = bridge({
    contentRoot: "/vault",
    getSnapshot: fixtureSnapshot,
  });
  t.after(close);
  const boot = await callBootstrap(bootstrap, {
    host: "127.0.0.1:3000",
    token,
  });
  const { origin } = JSON.parse(boot.body) as { origin: string };

  const response = await fetch(
    `${origin}/__riebeckite/bridge/v1/source?path=notes/hello.md`,
    {
      headers: {
        "x-riebeckite-bridge-token": token,
        "x-riebeckite-bridge-protocol": "1",
      },
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
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
    revision: 0,
  });
});

test("resolves manifest entries without exposing an absolute source path", () => {
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
  assert.deepEqual(resolveBridgeSource(snapshot, "../secret.md", options), {
    status: "unsupported",
    reason: "INVALID_SOURCE_PATH",
    revision: 4,
  });
  assert.deepEqual(
    inspectBridgePreview(snapshot, "notes/hello.md", options).preview,
    {
      available: true,
      developmentUrl: "http://127.0.0.1:5173/ja/hello/",
      productionUrl: undefined,
    },
  );
  assert.equal(
    (
      inspectBridgePublication(snapshot, "notes/hello.md", options)
        .publication as { visibility: string }
    ).visibility,
    "public",
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
  const plan = await mutationPlan(origin, [
    { kind: "create", path: "notes/hello.md", content: "Hello" },
  ]);
  const rejected = await mutationApply(origin, plan.id);
  assert.equal(rejected.status, 200);
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

test("persists approved plans across Bridge restart without an approval endpoint", async (t) => {
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
    },
    title: "Hello",
    frontmatter: {},
    publishing: { visibility: "public", routable: true, discoverable: true },
    html: "",
    tags: [],
    links: [],
    backlinks: [],
    assets: [],
  };
  return {
    manifest: {
      bySlug: new Map([[entry.slug, entry]]),
      redirects: new Map(),
      diagnostics: [],
      finalHtmlDiagnostics: [],
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

async function privateOrigin(
  bootstrap: (request: unknown, response: unknown) => Promise<void>,
): Promise<string> {
  const boot = await callBootstrap(bootstrap, {
    host: "127.0.0.1:3000",
    token,
  });
  return (JSON.parse(boot.body) as { origin: string }).origin;
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
