import path from "node:path";
import type { EnvironmentModuleNode, Plugin, ViteDevServer } from "vite";
import { isRiebeckiteRuntimeModuleId } from "./runtime_modules.js";

type RiebeckiteContentWatchOptions = {
  appRoot: () => Promise<string>;
  contentRoot: () => Promise<string>;
  exclude: () => readonly string[];
  onInvalidate?: (server: ViteDevServer) => void;
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
      void Promise.all([
        options.appRoot(),
        options.contentRoot(),
        import("@riebeckite/core"),
        import("@riebeckite/node"),
      ])
        .then(([appRoot, contentRoot, core, nodeUtils]) => {
          const { isAttachmentPath, isImagePath } = core;
          const { isIgnoredContentPath, isPathInsideDirectory, toLogicalPath } =
            nodeUtils;
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
              void invalidateApplicationRuntime(server, appRoot)
                .catch(() => {})
                .then(() => {
                  options.onInvalidate?.(server);
                  server.hot.send({ type: "full-reload" });
                });
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
              if (
                event === "change" &&
                (isImagePath(logicalPath) || isAttachmentPath(logicalPath))
              ) {
                server.hot.send({ type: "full-reload" });
                return;
              }
              invalidate();
            };

          server.watcher.on("add", handle("add"));
          server.watcher.on("change", handle("change"));
          server.watcher.on("unlink", handle("unlink"));
        })
        .catch(() => {});
    },
  };
}

export async function isSiteAssetPath(logicalPath: string): Promise<boolean> {
  const { isAttachmentPath, isImagePath } = await import("@riebeckite/core");
  return isImagePath(logicalPath) || isAttachmentPath(logicalPath);
}

export async function invalidateApplicationRuntime(
  server: Pick<ViteDevServer, "environments">,
  appRoot: string,
): Promise<number> {
  const { isPathInsideDirectory } = await import("@riebeckite/node");
  const moduleGraph = server.environments?.ssr?.moduleGraph;
  if (!moduleGraph) return 0;
  const appDirectory = path.join(appRoot, "app") + path.sep;
  const seen = new Set<EnvironmentModuleNode>();
  const timestamp = Date.now();
  let invalidated = 0;

  for (const mod of moduleGraph.idToModuleMap.values()) {
    if (!isApplicationRuntimeModule(mod, appDirectory, isPathInsideDirectory))
      continue;
    moduleGraph.invalidateModule(mod, seen, timestamp);
    invalidated += 1;
  }

  return invalidated;
}

function isApplicationRuntimeModule(
  mod: EnvironmentModuleNode,
  appDirectory: string,
  isPathInsideDirectory: (directory: string, file: string) => boolean,
): boolean {
  if (mod.file && isPathInsideDirectory(appDirectory, mod.file)) return true;
  return isRiebeckiteRuntimeModuleId(mod.id);
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
