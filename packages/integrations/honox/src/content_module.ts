import path from "node:path";
import type { CompletedContentBuildSnapshot } from "@riebeckite/core";
import type { ViteDevServer } from "vite";

export type ContentAppModule = {
  readonly content?: {
    getManifest?: () => Promise<unknown>;
    getCompletedBuildSnapshot?: () => CompletedContentBuildSnapshot | undefined;
  };
};

export function contentModuleEntry(appRoot: string): string {
  return path.join(appRoot, "app", "server.ts");
}

export function isContentModuleLoaded(
  server: Pick<ViteDevServer, "environments">,
  appRoot: string,
): boolean {
  const entry = contentModuleEntry(appRoot);
  const moduleGraph = server.environments?.ssr?.moduleGraph;
  return Boolean(
    moduleGraph?.getModuleById(entry) ??
      [...(moduleGraph?.idToModuleMap?.values() ?? [])].find(
        (module) =>
          module.file && path.resolve(module.file) === path.resolve(entry),
      ),
  );
}

export async function loadContentModule(
  server: Pick<ViteDevServer, "ssrLoadModule">,
  appRoot: string,
): Promise<ContentAppModule> {
  return (await server.ssrLoadModule(
    contentModuleEntry(appRoot),
  )) as ContentAppModule;
}
