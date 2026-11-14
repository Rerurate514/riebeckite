import type { CompletedContentBuildSnapshot } from "@riebeckite/core";
import { collectDevelopmentDiagnostics } from "@riebeckite/diagnostics";
import type { Plugin, ViteDevServer } from "vite";
import type { ResolvedInspectorApplication } from "./application.js";
import { inspectorClientModule } from "./development_inspector_client.js";
import { shouldInvalidateInspection } from "./development_inspector_helpers.js";
import {
  inspectAssets,
  inspectContentOutputs,
  unavailableAssetResult,
  unavailableOutputResult,
} from "./development_inspector_output.js";
import { configureInspectorServer } from "./development_inspector_server.js";
import type { CachedInspection } from "./development_inspector_types.js";

const clientModuleId = "virtual:riebeckite/development-inspector";
const resolvedClientModuleId = `\0${clientModuleId}`;
const invalidationDelayMs = 150;
const invalidators = new WeakMap<ViteDevServer, () => void>();

export function invalidateDevelopmentInspector(server: ViteDevServer): void {
  invalidators.get(server)?.();
}

export { diagnosticMatchesPage } from "./development_inspector_query.js";

export type DevelopmentInspectorOptions = {
  getSnapshot: (
    server: ViteDevServer,
  ) =>
    | CompletedContentBuildSnapshot
    | undefined
    | Promise<CompletedContentBuildSnapshot | undefined>;
};

export function riebeckiteDevelopmentInspector(
  getApplication: () => ResolvedInspectorApplication,
  options: DevelopmentInspectorOptions,
): Plugin {
  let revision = 0;
  let invalidatedAt = 0;
  let inspection: CachedInspection | null = null;
  let invalidationTimer: ReturnType<typeof setTimeout> | undefined;
  const invalidateInspection = (server: ViteDevServer) => {
    invalidatedAt = Date.now();
    if (invalidationTimer) clearTimeout(invalidationTimer);
    invalidationTimer = setTimeout(() => {
      invalidationTimer = undefined;
      revision += 1;
      server.hot.send({ type: "custom", event: "riebeckite:inspector" });
    }, invalidationDelayMs);
  };
  const inspectApplication = (
    application: ResolvedInspectorApplication,
    currentRevision: number,
    server: ViteDevServer,
  ): CachedInspection => {
    if (
      inspection?.revision === currentRevision &&
      inspection.application === application
    ) {
      return inspection;
    }
    if (inspection) inspection = null;
    const snapshot = Promise.resolve(options.getSnapshot(server)).then(
      (build) =>
        build && build.completedAt >= invalidatedAt ? build : undefined,
    );
    const report = snapshot.then((build) =>
      collectDevelopmentDiagnostics({
        config: application.config,
        contentDiagnostics: build
          ? [...build.manifest.diagnostics, ...build.finalHtmlDiagnostics]
          : undefined,
        revision: currentRevision,
        includeOutput: false,
      }),
    );
    const output = snapshot.then((build) =>
      build
        ? inspectContentOutputs(build, application)
        : unavailableOutputResult(),
    );
    const assets = snapshot.then((build) =>
      build ? inspectAssets(build, application) : unavailableAssetResult(),
    );
    const entry: CachedInspection = {
      application,
      revision: currentRevision,
      snapshot,
      report,
      output,
      assets,
      settlement: Promise.allSettled([snapshot, report, output, assets]).then(
        (results) => {
          const [snapshotResult] = results;
          if (
            results.some((result) => result.status === "rejected") ||
            (snapshotResult.status === "fulfilled" && !snapshotResult.value)
          ) {
            if (inspection === entry) inspection = null;
          }
        },
      ),
    };
    inspection = entry;
    return entry;
  };
  return {
    name: "riebeckite-development-inspector",
    apply: "serve",
    enforce: "pre",
    resolveId(id) {
      return id === clientModuleId ? resolvedClientModuleId : null;
    },
    load(id) {
      return id === resolvedClientModuleId ? inspectorClientModule() : null;
    },
    configureServer(server) {
      return configureInspectorServer({
        server,
        invalidators,
        getRevision: () => revision,
        getApplication,
        inspect: (application, currentRevision, target) =>
          inspectApplication(application, currentRevision, target),
        invalidate: (target) => invalidateInspection(target),
        clearInvalidation: () => {
          if (invalidationTimer) clearTimeout(invalidationTimer);
        },
      });
    },
    handleHotUpdate({ file, server }) {
      let application: ResolvedInspectorApplication | undefined;
      try {
        application = getApplication();
      } catch {
        application = undefined;
      }
      if (!shouldInvalidateInspection(application, file)) return;
      invalidateInspection(server);
    },
  };
}
