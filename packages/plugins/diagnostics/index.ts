import type {
  Diagnostic,
  PluginContext,
  ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import { definePlugin, FileSystemContentSource } from "@riebeckite/core";
import { analyzeContent } from "./src/analyze.js";
import { buildReport, DiagnosticsFailure } from "./src/report.js";
import { checkSiteIntegrity } from "./src/site_integrity.js";
import type {
  AnalyzerContentConfig,
  DiagnosticsOptions,
  DiagnosticsReport,
} from "./src/types.js";

export { analyzeContent } from "./src/analyze.js";
export {
  assertNoErrors,
  buildReport,
  DiagnosticsFailure,
  formatDiagnostics,
  groupByCode,
  summarize,
} from "./src/report.js";
export type {
  AnalyzerContentConfig,
  DiagnosticsOptions,
  DiagnosticsReport,
  DiagnosticsSummary,
} from "./src/types.js";

const PLUGIN_NAME = "diagnostics";

export async function runDiagnostics(
  target: ResolvedRiebeckiteConfig | string,
  options: DiagnosticsOptions = {},
): Promise<DiagnosticsReport> {
  const config = toAnalyzerConfig(target, options);
  try {
    return buildReport(await analyzeContent(config, options));
  } catch (error) {
    return buildReport([createInternalError(error)]);
  }
}

export function diagnostics(options: DiagnosticsOptions = {}) {
  return definePlugin({
    name: PLUGIN_NAME,
    options,
    addDiagnostics: async (context: PluginContext) => {
      const config = context.config;
      if (!config) return [];
      try {
        return await analyzeContent(toAnalyzerConfig(config, options), {
          ...analyticsCoverageOptions(config, options),
          skipReferenceIntegrity: true,
        });
      } catch (error) {
        return [createInternalError(error)];
      }
    },
    onManifestCreated: ({ manifest, diagnostics }) => {
      diagnostics.push(...checkSiteIntegrity(manifest, options));
    },
    onBuildEnd: ({ manifest }) => {
      if (!options.failOnError) return undefined;
      const errors = manifest.diagnostics.filter(
        (diagnostic) =>
          diagnostic.pluginName === PLUGIN_NAME &&
          diagnostic.severity === "error",
      );
      if (errors.length > 0) {
        throw new DiagnosticsFailure(buildReport(errors));
      }
      return undefined;
    },
  });
}

export const diagnosticsPlugin = diagnostics;

const ANALYTICS_PLUGIN_NAME = "analytics";

/**
 * Reports whether the resolved configuration enables the analytics plugin, so
 * the analytics coverage check turns itself on without coupling to the plugin.
 */
export function hasEnabledAnalyticsPlugin(
  config?: ResolvedRiebeckiteConfig,
): boolean {
  return (
    config?.plugins.some(
      (plugin) =>
        plugin.name === ANALYTICS_PLUGIN_NAME && plugin.enabled !== false,
    ) ?? false
  );
}

function analyticsCoverageOptions(
  config: ResolvedRiebeckiteConfig,
  options: DiagnosticsOptions,
): DiagnosticsOptions {
  return {
    ...options,
    reportAnalyticsCoverage:
      options.reportAnalyticsCoverage ?? hasEnabledAnalyticsPlugin(config),
  };
}

function createInternalError(error: unknown): Diagnostic {
  const message = error instanceof Error ? error.message : String(error);
  return {
    pluginName: PLUGIN_NAME,
    code: "internal-error",
    severity: "error",
    message: `content analysis failed: ${message}`,
  };
}

function toAnalyzerConfig(
  target: ResolvedRiebeckiteConfig | string,
  options: DiagnosticsOptions,
): AnalyzerContentConfig {
  if (typeof target === "string") {
    return {
      directory: target,
      exclude: options.exclude ?? [],
      publishStrategy: options.publishStrategy ?? "selective",
    };
  }
  return {
    directory: target.content.directory,
    source:
      target.content.source ??
      new FileSystemContentSource(
        target.content.directory,
        target.content.exclude,
      ),
    exclude: [...target.content.exclude, ...(options.exclude ?? [])],
    publishStrategy: target.content.filters.publishStrategy,
  };
}
