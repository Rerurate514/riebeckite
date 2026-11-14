import type { ViteDevServer } from "vite";
import type { ResolvedInspectorApplication } from "./application.js";
import type { CachedInspection } from "./development_inspector_types.js";

export type InspectorMiddleware = (
  request: import("node:http").IncomingMessage,
  response: import("node:http").ServerResponse,
) => Promise<void>;

export interface InspectorServerState {
  server: ViteDevServer;
  invalidators: WeakMap<ViteDevServer, () => void>;
  getRevision(): number;
  getApplication(): ResolvedInspectorApplication;
  inspect(
    application: ResolvedInspectorApplication,
    revision: number,
    server: ViteDevServer,
  ): CachedInspection;
  invalidate(server: ViteDevServer): void;
  clearInvalidation(): void;
}
