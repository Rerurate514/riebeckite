export type {
  ApiLifecycleConfig,
  ApiLifecycleDefinition,
  ApiLifecycleKind,
  ApiLifecycleRegistry,
  ApiLifecycleStatus,
  ApiLifecycleValidationIssue,
} from "./src/api_lifecycle.js";
export {
  API_LIFECYCLE_DIAGNOSTIC_CODE,
  API_LIFECYCLE_METADATA_DIAGNOSTIC_CODE,
  ApiLifecycleValidationError,
  attachApiLifecycleConfigSource,
  builtInApiLifecycle,
  collectApiLifecycleDefinitions,
  createApiLifecycleRegistry,
  defineApiLifecycle,
  getApiLifecycleConfigSource,
  hasApiLifecycleConfigPath,
  resolveApiLifecycle,
  validateApiLifecycleDefinition,
} from "./src/api_lifecycle.js";
export type {
  CliArgumentDefinition,
  CliArgumentOptions,
  CliArgumentsOf,
  CliArgumentValue,
  CliBooleanOptions,
  CliCommandContext,
  CliCommandDefinition,
  CliCommandHandler,
  CliCommandInput,
  CliCommandNode,
  CliCommandRegistration,
  CliCommandRegistry,
  CliCommandResolution,
  CliCommandResult,
  CliCommandSource,
  CliCommandSpec,
  CliDiagnostic,
  CliDiagnosticSeverity,
  CliDiagnosticSink,
  CliEnumOptions,
  CliExample,
  CliJsonEnvelope,
  CliJsonErrorEnvelope,
  CliLogger,
  CliNumberOptions,
  CliOptionDefinition,
  CliOptionsOf,
  CliOptionType,
  CliOptionValue,
  CliOutput,
  CliProjectContext,
  CliShell,
  CliStringOptions,
  CliTypedCommand,
  CliTypedCommandInput,
  HelpOptions,
  PluginCliExtension,
} from "./src/cli/index.js";
export {
  CliAbortError,
  CliCommandConflictError,
  CliCommandError,
  CliUsageError,
  cliArgument,
  cliBoolean,
  cliEnum,
  cliExample,
  cliNumber,
  cliString,
  cliStringWithDefault,
  cliVariadicArgument,
  createCliCommandRegistry,
  defineCliCommand,
  registerCliCommand,
  registerPluginCliExtension,
  resolveCliCommand,
} from "./src/cli/index.js";
export type {
  ClientInitializerContext,
  ClientResourceScope,
} from "./src/client_lifecycle.js";
export type {
  ClientRuntime,
  ClientRuntimeCreateOptions,
  ClientRuntimeHost,
  ClientRuntimeInvokeOptions,
} from "./src/client_runtime.js";
export {
  defineConfig,
  isExcluded,
  isPublished,
  resolveConfig,
  resolveConfigModule,
} from "./src/config.js";
export { ConfigValidationError } from "./src/config_validation.js";
export type { DevelopmentTrace } from "./src/development_trace.js";
export { createDevelopmentTrace } from "./src/development_trace.js";
export type {
  DependencyGraphResult,
  GraphEdge,
  GraphNode,
  GraphQuery,
} from "./src/inspection/graph.js";
export { inspectDependencyGraph } from "./src/inspection/graph.js";
export type {
  PluginExecution,
  PluginExecutionQuery,
  PluginExecutionResult,
  PluginHookExecution,
} from "./src/inspection/plugin_execution.js";
export { inspectPluginExecution } from "./src/inspection/plugin_execution.js";
export type {
  RegenerationInspection,
  RegenerationReason,
} from "./src/inspection/regeneration.js";
export { inspectRegeneration } from "./src/inspection/regeneration.js";
export type { ThemeConfigInspection } from "./src/inspection/theme.js";
export { inspectThemeConfig } from "./src/inspection/theme.js";
export type {
  ContentMigrationBatch,
  ContentMigrationFileDiff,
  ContentMigrationPlannedFile,
  ContentMigrationPlannerFile,
  ContentMigrationPlannerOptions,
  ContentMigrationSelection,
  ContentMigrationSkip,
} from "./src/migration/migration_planner.js";
export { planContentMigrationBatch } from "./src/migration/migration_planner.js";
export type { ContentMigrationRegistry } from "./src/migration/migration_registry.js";
export {
  ContentMigrationRegistryError,
  createContentMigrationRegistry,
  defineContentMigration,
  fingerprintContentMigrationDefinition,
  migrationKey,
} from "./src/migration/migration_registry.js";
export type {
  ContentIdRule,
  ContentMigrationRule,
  ContentMigrationRuleCondition,
  ContentMigrationRuleValue,
  FrontmatterAppendRule,
  FrontmatterMapRule,
  FrontmatterNormalizeListRule,
  FrontmatterRemoveRule,
  FrontmatterRenameRule,
  FrontmatterSetRule,
  PathRenameRule,
  PermalinkRule,
  VisibilityRule,
} from "./src/migration/migration_rules.js";
export type {
  ContentMigrationHistory,
  ContentMigrationHistoryRun,
  ContentMigrationHistoryStatus,
  ContentMigrationListEntry,
  ContentMigrationRecord,
  ContentMigrationRecoveryState,
  ContentMigrationState,
  ContentMigrationStatus,
} from "./src/migration/migration_state.js";
export {
  appendContentMigrationHistory,
  CONTENT_MIGRATION_HISTORY_LIMIT,
  ContentMigrationStateError,
  emptyContentMigrationHistory,
  emptyContentMigrationState,
  findContentMigrationRecord,
  listContentMigrationEntries,
  parseContentMigrationHistory,
  parseContentMigrationState,
  sanitizeContentMigrationPath,
  sanitizeContentMigrationPaths,
  upsertContentMigrationRecord,
} from "./src/migration/migration_state.js";
export type {
  MigrationContentApplication,
  MigrationContentState,
  ParsedMigrationContent,
} from "./src/migration/migration_transform.js";
export {
  applyContentMigration,
  diffFrontmatter,
  isSafeContentPath,
  parseMigrationContent,
} from "./src/migration/migration_transform.js";
export type {
  ContentMigration,
  ContentMigrationDefinition,
  ContentMigrationDiagnostic,
  ContentMigrationReversible,
  ContentMigrationSelector,
  ContentMigrationTransform,
  ContentMigrationTransformResult,
  ContentMigrationValidator,
  MigrationContent,
} from "./src/migration/migration_types.js";
export type {
  BuildTraceRecorder,
  LogContext,
  Logger,
  LogLevel,
  Observability,
  ObservabilityValue,
  TraceAttributes,
  TraceEvent,
  Tracer,
  TraceSink,
  TraceSnapshot,
  TraceSpan,
} from "./src/observability.js";
export {
  CompositeTraceSink,
  ConsoleLogger,
  NoopLogger,
  NoopTracer,
  SinkTracer,
} from "./src/observability.js";
export { finalizeDeferredMarkdownComponents } from "./src/plugin_component_deferred.js";
export { prepareMarkdownComponent } from "./src/plugin_component_render.js";
export {
  resolveBuildOutputDirectory,
  resolveManagedStateRoot,
} from "./src/project/project_layout.js";
export type {
  BuildProvenance,
  BuildProvenanceComparison,
  ProvenanceArtifact,
  ProvenanceOutput,
  ProvenanceSource,
  ProvenanceTransform,
} from "./src/provenance/provenance.js";
export {
  appendProvenanceHistory,
  attachProvenanceArtifacts,
  compareBuildProvenance,
  createBuildProvenance,
  MAX_PROVENANCE_HISTORY,
  PROVENANCE_VERSION,
} from "./src/provenance/provenance.js";
export {
  createContentManifest,
  createContentManifestEntry,
  createInvalid,
  createPluginContentLocationContext,
  createPluginContext,
  createPluginManifestContext,
  createResolvedRiebeckiteConfig,
  createRiebeckiteConfig,
} from "./src/testing/fixtures.js";
export { uniqueStrings } from "./src/utils/collections.js";
export { attachErrorPath } from "./src/utils/error.js";
export {
  escapeHtml,
  escapeHtmlAttribute,
  escapeScriptJson,
} from "./src/utils/html.js";
export type { MarkdownFenceLine } from "./src/utils/markdown.js";
export { scanMarkdownFenceLines } from "./src/utils/markdown.js";
export { normalizeTag } from "./src/utils/tags.js";
export {
  calculateReadingTime,
  escapeRegExp,
  htmlToPlainText,
  stripHtml,
} from "./src/utils/text.js";
export { parseYaml } from "./src/utils/yaml.js";
