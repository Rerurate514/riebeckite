import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
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
