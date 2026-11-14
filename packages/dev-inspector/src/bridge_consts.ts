import { createRequire } from "node:module";
import type { ViteDevServer } from "vite";

export const bridgePath = "/__riebeckite/bridge/v1";

export const bridgePagePath = "/__riebeckite/bridge/v1/page";

export const bridgeBootstrapPath = "/__riebeckite/bridge/bootstrap";

export const bridgeProtocolVersion = 1;

export const bridgeTokenHeader = "x-riebeckite-bridge-token";

export const bridgeProtocolHeader = "x-riebeckite-bridge-protocol";

export const bridgeMutationTokenHeader = "x-riebeckite-bridge-mutation-token";

export const invalidators = new WeakMap<ViteDevServer, () => void>();

export const riebeckiteVersion = (
  createRequire(import.meta.url)("../package.json") as { version: string }
).version;
