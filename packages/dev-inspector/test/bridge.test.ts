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
import { createBridgeMutationStore } from "../src/bridge_mutation.js";

const token = "a".repeat(32);

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

test("requires a one-time approval before applying a planned mutation", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "riebeckite-bridge-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const mutations = createBridgeMutationStore(root);
  const plan = await mutations.plan([
    { kind: "create", path: "notes/hello.md", content: "Hello" },
  ]);
  const rejected = await mutations.apply(plan.id, "missing");
  assert.equal((rejected as { applied: boolean }).applied, false);
  const approval = mutations.approve(plan.id);
  assert.ok(approval);
  const applied = await mutations.apply(plan.id, approval.approvalId);
  assert.equal((applied as { applied: boolean }).applied, true);
  const replay = await mutations.apply(plan.id, approval.approvalId);
  assert.equal((replay as { applied: boolean }).applied, false);
  assert.equal(
    await fs.readFile(path.join(root, "notes/hello.md"), "utf8"),
    "Hello",
  );
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
}): {
  bootstrap: (request: unknown, response: unknown) => Promise<void>;
  close: () => void;
} {
  const stack: Array<{ route: string; handle: unknown }> = [];
  let close: (() => void) | undefined;
  const plugin = riebeckiteBridge({
    token,
    contentRoot: input?.contentRoot,
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
