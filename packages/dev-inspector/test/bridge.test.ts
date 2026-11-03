import assert from "node:assert/strict";
import test from "node:test";
import type { ViteDevServer } from "vite";
import { riebeckiteBridge } from "../src/bridge.js";

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
      capabilities: ["status", "page-resolution", "preview"],
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

test("resolves a source through the content manifest without exposing drafts as routes", async (t) => {
  const snapshot = {
    completedAt: 42,
    manifest: {
      contentIndex: new Map([["notes/hello", "notes/hello"]]),
      bySlug: new Map([
        [
          "notes/hello",
          {
            permalink: "/custom/hello/",
            publishing: {
              visibility: "draft",
              routable: false,
              discoverable: false,
            },
            publicLocation: { language: "ja" },
          },
        ],
      ]),
    },
  };
  const { bootstrap, close } = bridge(snapshot);
  t.after(close);
  const boot = await callBootstrap(bootstrap, {
    host: "127.0.0.1:3000",
    token,
  });
  const { origin } = JSON.parse(boot.body) as { origin: string };

  const response = await fetch(
    `${origin}/__riebeckite/bridge/v1/page?source=notes%2Fhello.md`,
    {
      headers: {
        "x-riebeckite-bridge-token": token,
        "x-riebeckite-bridge-protocol": "1",
      },
    },
  );
  assert.deepEqual(await response.json(), {
    status: "resolved",
    source: "notes/hello.md",
    page: "/custom/hello/",
    visibility: "draft",
    routable: false,
    discoverable: false,
    locale: "ja",
    publishAt: null,
    revision: 42,
    productionUrl: null,
  });
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

function bridge(snapshot?: unknown): {
  bootstrap: (request: unknown, response: unknown) => Promise<void>;
  close: () => void;
} {
  const stack: Array<{ route: string; handle: unknown }> = [];
  let close: (() => void) | undefined;
  const plugin = riebeckiteBridge({
    token,
    getSnapshot: () => snapshot as never,
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
