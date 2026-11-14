export type ProfileSpanAggregate = Readonly<{
  calls: number;
  cumulativeDurationMs: number;
  averageDurationMs: number;
  maxDurationMs: number;
  wallDurationMs: number | undefined;
}>;

export type ProfilePlugin = Readonly<{
  name: string;
  duration: ProfileSpanAggregate;
}>;

export type ProfileIncremental = Readonly<{
  added: number;
  changed: number;
  removed: number;
  unchanged: number;
  affected: number;
}>;

export type ProfileCache = Readonly<{
  hits: number;
  misses: number;
  hitRate: number | undefined;
}>;

export type ProfileCacheReasonCount = Readonly<{
  reason: string;
  count: number;
}>;

export type ProfileContentCache = Readonly<{
  hits: number;
  misses: number;
  bypasses: number;
  hitRate: number | undefined;
  missReasons: readonly ProfileCacheReasonCount[];
  bypassReasons: readonly ProfileCacheReasonCount[];
}>;

export type ProfileSlowOperation = Readonly<{
  plugin: string;
  name: string;
  durationMs: number;
  contentPath: string;
}>;

export type ProfileDiagnostics = Readonly<{
  calls: number;
  durationMs: number;
  total: number;
  errors: number;
  warnings: number;
  info: number;
}>;

export type ProfileFastPath = Readonly<{
  used: boolean;
  blockReason: string;
  fastPathDecisionDurationMs: number;
  buildStateReadDurationMs: number;
  contentPlanDurationMs: number;
  externalDependencyDurationMs: number;
  pluginValidationDurationMs: number;
  outputInventoryValidationDurationMs: number;
  outputHashValidationDurationMs: number;
  outputFilesHashed: number;
  outputBytesHashed: number;
  rssBeforeBytes: number;
  rssAfterBytes: number;
  peakRssBytes: number;
}>;

export type ProfileReport = Readonly<{
  totalDurationMs: number | undefined;
  stages: ReadonlyMap<string, ProfileSpanAggregate>;
  content: ReadonlyMap<string, ProfileSpanAggregate>;
  integrations: ReadonlyMap<string, ProfileSpanAggregate>;
  plugins: readonly ProfilePlugin[];
  incremental: ProfileIncremental | undefined;
  cache: ProfileCache | undefined;
  contentCache: ProfileContentCache | undefined;
  fastPath: ProfileFastPath | undefined;
  diagnostics: ProfileDiagnostics | undefined;
  slowestOperations: readonly ProfileSlowOperation[];
}>;

export type DiagnosticCounts = {
  total: number;
  errors: number;
  warnings: number;
  info: number;
};

export type MutableDuration = {
  cumulativeDurationMs: number;
  calls: number;
  maxDurationMs: number;
};
