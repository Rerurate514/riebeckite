import crypto from "node:crypto";
import http from "node:http";
import type { Plugin, ViteDevServer } from "vite";
import { bridgeBootstrapPath, invalidators } from "./bridge_consts.js";
import {
  closeBridgeServer,
  createBootstrapHandler,
  handleBridgeRequest,
  invalidateBridgeClients,
} from "./bridge_handlers.js";
import type {
  BridgeServerState,
  RiebeckiteBridgeOptions,
} from "./bridge_types.js";

export type { RiebeckiteBridgeOptions } from "./bridge_types.js";

export function invalidateRiebeckiteBridge(server: ViteDevServer): void {
  invalidators.get(server)?.();
}

export function riebeckiteBridge(options: RiebeckiteBridgeOptions): Plugin {
  return {
    name: "riebeckite-bridge",
    apply: "serve",
    configureServer(server) {
      const token = options.token;
      if (!token || token.length < 32) return;

      const state: BridgeServerState = {
        revision: 0,
        mutations: undefined,
        eventClients: new Set<http.ServerResponse>(),
        serverId: crypto.randomUUID(),
      };
      const privateServer = http.createServer((request, response) =>
        handleBridgeRequest(request, response, {
          options,
          server,
          token,
          state,
        }),
      );
      const privateReady = new Promise<void>((resolve, reject) => {
        privateServer.once("listening", resolve);
        privateServer.once("error", reject);
      });
      privateServer.listen(0, "127.0.0.1");
      privateServer.unref();

      server.middlewares.use(
        bridgeBootstrapPath,
        createBootstrapHandler(server, token, privateServer, privateReady),
      );
      invalidators.set(server, () => invalidateBridgeClients(state));
      server.httpServer?.once("close", () =>
        closeBridgeServer(server, state, privateServer),
      );
    },
  };
}
