import path from "node:path";
import {
  isAttachmentPath,
  isIgnoredContentPath,
  isImagePath,
  normalizeContentPath,
} from "@riebeckite/core";
import type { EnvironmentModuleNode, Plugin, ViteDevServer } from "vite";

export type RiebeckiteContentWatchOptions = {
  appRoot: () => string;
  contentRoot: () => string;
  exclude: () => readonly string[];
};

type ContentEvent = "add" | "change" | "unlink";

const CONTENT_RELOAD_DEBOUNCE_MS = 60;

const configuredWatchers = new WeakSet<object>();

export function riebeckiteContentWatch(
  options: RiebeckiteContentWatchOptions,
): Plugin {
  return {
    name: "riebeckite-content-watch",
    apply: "serve",
    enforce: "post",
    configureServer(server) {
      if (configuredWatchers.has(server.watcher)) return;
      configuredWatchers.add(server.watcher);
      const appRoot = options.appRoot();
      const contentRoot = options.contentRoot();
      const exclude = options.exclude();
      const isContentFile = (file: string) =>
        isPathInsideDirectory(contentRoot, file);

      server.watcher.add(contentRoot);
      suppressRestartOnContentEvents(server, isContentFile);

      let timer: ReturnType<typeof setTimeout> | undefined;
      const invalidate = () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          timer = undefined;
          invalidateApplicationRuntime(server, appRoot);
          server.hot.send({ type: "full-reload" });
        }, CONTENT_RELOAD_DEBOUNCE_MS);
      };
      server.httpServer?.once("close", () => {
        if (timer) clearTimeout(timer);
      });

      const handle =
        (event: ContentEvent) =>
        (file: string): void => {
          if (!isContentFile(file)) return;
          const logicalPath = toLogicalPath(contentRoot, file);
          if (isIgnoredContentPath(logicalPath, exclude)) return;
          if (event === "change" && isSiteAssetPath(logicalPath)) {
            server.hot.send({ type: "full-reload" });
            return;
          }
          invalidate();
        };

      server.watcher.on("add", handle("add"));
      server.watcher.on("change", handle("change"));
      server.watcher.on("unlink", handle("unlink"));
    },
  };
}

export function isSiteAssetPath(logicalPath: string): boolean {
  return isImagePath(logicalPath) || isAttachmentPath(logicalPath);
}

export function isPathInsideDirectory(
  directory: string,
  file: string,
): boolean {
  const root = normalizeForCompare(directory).replace(/\/+$/, "");
  if (!root) return false;
  const target = normalizeForCompare(file);
  return target === root || target.startsWith(`${root}/`);
}

export function toLogicalPath(directory: string, file: string): string {
  return normalizeContentPath(
    path.relative(normalizeContentPath(directory), normalizeContentPath(file)),
  );
}

export function invalidateApplicationRuntime(
  server: Pick<ViteDevServer, "environments">,
  appRoot: string,
): number {
  const moduleGraph = server.environments?.ssr?.moduleGraph;
  if (!moduleGraph) return 0;
  const appDirectory = path.join(appRoot, "app") + path.sep;
  const seen = new Set<EnvironmentModuleNode>();
  const timestamp = Date.now();
  let invalidated = 0;

  for (const mod of moduleGraph.idToModuleMap.values()) {
    const file = mod.file;
    if (!file || !isPathInsideDirectory(appDirectory, file)) continue;
    moduleGraph.invalidateModule(mod, seen, timestamp);
    invalidated += 1;
  }

  return invalidated;
}

function suppressRestartOnContentEvents(
  server: Pick<ViteDevServer, "watcher">,
  isContentFile: (file: string) => boolean,
): void {
  for (const event of ["add", "unlink"] as const) {
    const listeners = (
      server.watcher.rawListeners(event) as Array<(file: string) => unknown>
    ).slice();
    server.watcher.removeAllListeners(event);
    for (const listener of listeners) {
      server.watcher.on(event, (file: string) => {
        if (isContentFile(file)) return;
        listener(file);
      });
    }
  }
}

function normalizeForCompare(value: string): string {
  const normalized = normalizeContentPath(value);
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}
