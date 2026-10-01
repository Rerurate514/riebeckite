import {
  definePlugin,
  type JsonValue,
  type Logger,
  type PluginCache,
  type RiebeckitePlugin,
} from "@riebeckite/core";
import {
  applyRouteRedirects,
  buildRouteLock,
  diffRoutes,
  emptyRouteLock,
  parseRouteLock,
  type RedirectStatus,
  type RenameDiagnostic,
  type RouteLock,
} from "./src/lock.js";

export type {
  DiffRoutesOptions,
  DiffRoutesResult,
  ManifestRedirect,
  RedirectRule,
  RedirectSink,
  RedirectStatus,
  RenameDiagnostic,
  RouteLock,
  RouteLockRedirect,
  RouteLockRoute,
  RouteLockSourceEntry,
} from "./src/lock.js";
export {
  applyRouteRedirects,
  buildRouteLock,
  collapseRedirects,
  diffRoutes,
  emptyRouteLock,
  hashContent,
  isRedirectStatus,
  parseRouteLock,
} from "./src/lock.js";

const PLUGIN_NAME = "rename";
const LOCK_KEY = "routes.lock";
const CACHE_VERSION = "1";
const LOCK_MESSAGE =
  "Rename plugin: route lock could not be used; starting from an empty lock.";

export type RenameOptions = {
  /** Enables rename detection and redirect emission. Defaults to `true`. */
  enabled?: boolean;
  /** HTTP status for newly discovered rename redirects. Defaults to `308`. */
  status?: RedirectStatus;
  /** Severity for routes that disappear without rename evidence. Defaults to `"warning"`. */
  onUnexpectedRemoval?: "info" | "warning" | "error";
};

/**
 * Reduces broken URLs after note renames by reusing the existing redirect
 * machinery (`manifest.redirects`). The only cross-build state is a JSON route
 * lock persisted through `context.cache`; no files are written directly.
 */
export function renamePlugin(
  options: RenameOptions = {},
): RiebeckitePlugin<RenameOptions> {
  const enabled = options.enabled ?? true;
  const status = options.status ?? 308;
  const onUnexpectedRemoval = options.onUnexpectedRemoval ?? "warning";

  if (!([301, 302, 307, 308] as const).includes(status)) {
    throw new Error(`Rename plugin: invalid redirect status ${status}.`);
  }
  if (!(["info", "warning", "error"] as const).includes(onUnexpectedRemoval)) {
    throw new Error(
      `Rename plugin: invalid onUnexpectedRemoval severity "${onUnexpectedRemoval}".`,
    );
  }

  return definePlugin<RenameOptions>({
    name: PLUGIN_NAME,
    options,
    cacheVersion: CACHE_VERSION,
    enabled,
    onManifestCreated: async ({
      manifest,
      config,
      cache,
      diagnostics,
      logger,
    }) => {
      if (!enabled) return;
      if (!config) {
        logger.warn(
          "Rename plugin: no resolved config is available; skipping rename detection.",
        );
        return;
      }

      const previous = await readLock(cache, logger);
      const current = buildRouteLock(manifest.publicEntries);
      const result = diffRoutes(previous, current, {
        status,
        onUnexpectedRemoval,
      });

      for (const diagnostic of result.diagnostics) {
        diagnostics.push(renameDiagnostic(diagnostic));
      }

      applyRouteRedirects(manifest, result.lock.redirects);
      await writeLock(cache, result.lock, logger);
    },
  });
}

export const rename = renamePlugin;

async function readLock(
  cache: PluginCache,
  logger: Logger,
): Promise<RouteLock> {
  try {
    const raw = await cache.get<JsonValue>(LOCK_KEY);
    if (raw === undefined) return emptyRouteLock();
    const parsed = parseRouteLock(raw);
    if (!parsed) {
      logger.warn(LOCK_MESSAGE, { key: LOCK_KEY });
      return emptyRouteLock();
    }
    return parsed;
  } catch (error) {
    logger.warn(LOCK_MESSAGE, { key: LOCK_KEY, error: messageOf(error) });
    return emptyRouteLock();
  }
}

async function writeLock(
  cache: PluginCache,
  lock: RouteLock,
  logger: Logger,
): Promise<void> {
  try {
    await cache.set(LOCK_KEY, lock as unknown as JsonValue);
  } catch (error) {
    logger.warn("Rename plugin: route lock could not be persisted.", {
      key: LOCK_KEY,
      error: messageOf(error),
    });
  }
}

function renameDiagnostic(diagnostic: RenameDiagnostic) {
  return { pluginName: PLUGIN_NAME, ...diagnostic };
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
