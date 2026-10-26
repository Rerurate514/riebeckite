import type { OutputDescriptor } from "@riebeckite/core";
import type { toSSG } from "hono/ssg";

export type GeneratedOutputAsset = {
  type: "asset";
  fileName: string;
  source: string | Uint8Array;
};

type SsgGeneratedHtmlDiagnostic = {
  severity: "info" | "warning" | "error";
  message: string;
  code?: string;
  filePath?: string;
};

type SsgHtmlInspectorPlugin = {
  name?: string;
  inspectGeneratedHtml?: (page: {
    path: string;
    html: string;
  }) => readonly SsgGeneratedHtmlDiagnostic[];
};

export type SsgModule = {
  default: Parameters<typeof toSSG>[0];
  content?: {
    getManifest(): Promise<{
      generatedOutputs?: readonly {
        path: string;
        content: string | Uint8Array;
      }[];
    }>;
    getProcessedContentCount(): number;
    getReusedContentCount(): number;
    getManifestHookMetrics(): {
      manifestHooksExecuted: number;
      manifestHooksReused: number;
      manifestHookCacheHit: number;
      manifestHookCacheMiss: number;
      manifestHookDurationMs: number;
      byPlugin: Record<
        string,
        {
          executed: number;
          reused: number;
          cacheHit: number;
          cacheMiss: number;
          durationMs: number;
          reason: string;
        }
      >;
    };
    getOutputChangeSet(): Promise<{
      affected: readonly OutputDescriptor[];
      removed: readonly OutputDescriptor[];
      unchanged: readonly OutputDescriptor[];
      fullRegenerationRequired: boolean;
      candidateOutputCount: number;
      affectedOutputCount: number;
      removedOutputCount: number;
      unchangedOutputCount: number;
    }>;
  };
  config?: {
    plugins?: readonly SsgHtmlInspectorPlugin[];
  };
};

export type SsgOutputChangeSet =
  NonNullable<SsgModule["content"]> extends {
    getOutputChangeSet(): Promise<infer T>;
  }
    ? T
    : never;

export type SsgOutputMetrics = {
  processedContentCount: number;
  reusedContentCount: number;
  candidateOutputCount: number;
  affectedOutputCount: number;
  removedOutputCount: number;
  unchangedOutputCount: number;
  renderedOutputCount: number;
  emittedOutputCount: number;
  reusedOutputCount: number;
  deletedOutputCount: number;
  shadowedOutputCount: number;
  fullRegenerationRequired: boolean;
  htmlOutputCount: number;
  assetOutputCount: number;
  cacheFileSizeBytes: number | null;
  cacheEntriesRead: number;
  cacheEntriesSerialized: number;
  enumeratedRouteCount: number;
  renderedRouteCount: number;
  skippedRouteCount: number;
  manifestHooksExecuted: number;
  manifestHooksReused: number;
  manifestHookCacheHit: number;
  manifestHookCacheMiss: number;
  manifestHookDurationMs: number;
  manifestHookPlugins: Record<string, unknown>;
  plannedOutputCount: number;
  actualOutputCount: number;
  matchedOutputCount: number;
  missingInPlanCount: number;
  missingInDistCount: number;
  unknownOutputCount: number;
  ownerConflictCount: number;
  publicationViolationCount: number;
  plannedGenerateOutputCount: number;
  plannedReuseOutputCount: number;
  plannedRemoveOutputCount: number;
  plannedUnknownOutputCount: number;
  outputPlanMemoryDeltaBytes: number;
  outputCacheDecision: OutputCacheDecision;
  outputCacheRejectionReason: OutputCacheRejectionReason | null;
  timingsMs: Record<string, number>;
};

export type OutputCacheRejectionReason =
  | "change-set-unavailable"
  | "full-regeneration-required"
  | "output-cache-missing-or-invalid"
  | "app-fingerprint-changed"
  | "client-manifest-fingerprint-changed"
  | "unchanged-output-not-cached";

export type OutputCacheDecision = {
  readonly changeSetPresent: boolean;
  readonly changeSetRequiresFullRegeneration: boolean;
  readonly outputCacheLoaded: boolean;
  readonly appFingerprintMatch: boolean;
  readonly clientManifestFingerprintMatch: boolean;
  readonly uncoveredUnchangedCount: number;
};

export type NoChangeFastPathResult = {
  readonly used: boolean;
  readonly blockReason?: string;
};

export type NoChangeFastPathOutputMetrics = {
  outputInventoryValidationDurationMs: number;
  outputHashValidationDurationMs: number;
  outputFilesHashed: number;
  outputBytesHashed: number;
};
