import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import http from "node:http";
import type net from "node:net";
import { test } from "node:test";
import { createInvalid } from "@riebeckite/core";
import type { ViteDevServer } from "vite";
import { riebeckiteContentWarmup } from "../src/vite_plugin.js";

test("warms the content manifest after the dev server listens", async () => {
  const httpServer = new EventEmitter();
  let loaded = 0;
  let built = 0;
  const plugin = riebeckiteContentWarmup(true, async () =>
    createInvalid({ appRoot: "/site" }),
  );
  const server = createInvalid<ViteDevServer>({
    httpServer,
    ssrLoadModule: async () => {
      loaded += 1;
      return {
        content: {
          getManifest: async () => {
            built += 1;
          },
        },
      };
    },
  });

  (plugin.configureServer as (server: ViteDevServer) => void)(server);
  httpServer.emit("listening");
  await new Promise<void>((resolve) => setImmediate(resolve));

  assert.equal(loaded, 1);
  assert.equal(built, 1);
});

test("holds vite url output until the first page responds", async () => {
  const upstream = http.createServer((_request, response) => {
    response.writeHead(200);
    response.end();
  });
  upstream.listen(0, "127.0.0.1");
  await EventEmitter.once(upstream, "listening");
  const origin = `http://127.0.0.1:${(upstream.address() as net.AddressInfo).port}/`;

  const infoCalls: string[] = [];
  const logger = {
    info: (message: string) => {
      infoCalls.push(message);
    },
    error: (message: string) => {
      infoCalls.push(message);
    },
  };
  let urlPrints = 0;
  const httpServer = new EventEmitter();
  const plugin = riebeckiteContentWarmup(true, async () =>
    createInvalid({ appRoot: "/site" }),
  );
  const server = createInvalid<ViteDevServer>({
    httpServer,
    resolvedUrls: { local: [origin], network: [] },
    printUrls: () => {
      urlPrints += 1;
    },
    config: { logger: createInvalid(logger) },
    ssrLoadModule: async () => ({
      content: { getManifest: async () => undefined },
    }),
  });

  (plugin.configureServer as (server: ViteDevServer) => void)(server);
  httpServer.emit("listening");
  await new Promise<void>((resolve) => setImmediate(resolve));
  const info = server.config.logger.info.bind(server.config.logger);
  info(
    "\n  \x1b[32m\x1b[1mVITE\x1b[22m v0.2.0\x1b[39m\x1b[2m  ready in \x1b[0m\x1b[1m120\x1b[22m\x1b[2m ms\x1b[0m\n",
    { clear: true },
  );

  const deadline = performance.now() + 5000;
  let readyIndex = -1;
  while (performance.now() < deadline) {
    readyIndex = infoCalls.findIndex((message) =>
      message.includes("riebeckite: ready at"),
    );
    if (readyIndex !== -1) break;
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
  }

  const bannerIndex = infoCalls.findIndex(
    (message) => message.includes("v0.2.0") && message.includes("ready in"),
  );
  assert.ok(
    infoCalls.some((message) =>
      message.includes("riebeckite: preparing the first page"),
    ),
  );
  assert.ok(bannerIndex !== -1 && bannerIndex < readyIndex);
  assert.equal(urlPrints, 1);

  upstream.close();
  await EventEmitter.once(upstream, "close");
});
