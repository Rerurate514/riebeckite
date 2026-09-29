import type {
  Diagnostic,
  DiagnosticCode,
  DiagnosticSeverity,
} from "@riebeckite/core";
import type { DiagnosticsOptions } from "../types.js";

const PLUGIN_NAME = "diagnostics";

const DEFAULT_SEVERITY: Record<string, DiagnosticSeverity> = {
  "broken-wikilink": "error",
  "broken-image": "error",
  "broken-link": "error",
  "unused-asset": "warning",
  "orphan-note": "info",
  "missing-frontmatter": "warning",
  "publish-conflict": "warning",
  "duplicate-title": "warning",
  "slug-collision": "error",
  "excluded-public": "warning",
  "publish-boundary": "warning",
  "analytics-untracked": "info",
  "internal-error": "error",
};

export type NoteLocation = {
  slug?: string;
  filePath?: string;
};

export type AnalysisState = {
  referencedAssets: Set<string>;
  incoming: Map<string, Set<string>>;
};

export type NormalizedOptions = {
  reportUnusedAssets: boolean;
  reportOrphans: boolean;
  reportAnalyticsCoverage: boolean;
  requiredFrontmatter: string[];
  severity: Partial<Record<string, DiagnosticSeverity>>;
};

export function createAnalysisState(): AnalysisState {
  return {
    referencedAssets: new Set<string>(),
    incoming: new Map<string, Set<string>>(),
  };
}

export function normalizeOptions(
  options: DiagnosticsOptions,
): NormalizedOptions {
  return {
    reportUnusedAssets: options.reportUnusedAssets ?? false,
    reportOrphans: options.reportOrphans ?? false,
    reportAnalyticsCoverage: options.reportAnalyticsCoverage ?? false,
    requiredFrontmatter: options.requiredFrontmatter ?? [],
    severity: options.severity ?? {},
  };
}

export function addIncoming(
  state: AnalysisState,
  target: string,
  source: string,
) {
  const sources = state.incoming.get(target) ?? new Set<string>();
  sources.add(source);
  state.incoming.set(target, sources);
}

export function pushDiagnostic(
  diagnostics: Diagnostic[],
  options: NormalizedOptions,
  location: NoteLocation,
  code: DiagnosticCode,
  message: string,
  target?: string,
  suggestion?: string,
  line?: number,
  column?: number,
) {
  diagnostics.push({
    pluginName: PLUGIN_NAME,
    code,
    severity: options.severity[code] ?? DEFAULT_SEVERITY[code] ?? "warning",
    message,
    slug: location.slug,
    filePath: location.filePath,
    line,
    column,
    target,
    suggestion,
  });
}
