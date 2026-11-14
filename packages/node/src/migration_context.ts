import type {
  ContentManifest,
  ContentMigrationBatch,
  ContentMigrationDiagnostic,
  ContentMigrationHistory,
  ContentMigrationHistoryStatus,
  ContentMigrationListEntry,
  ContentMigrationRecord,
  ContentMigrationRecoveryState,
  ContentMigrationState,
  ContentMigrationStatus,
  ContentMutationOperation,
  ContentMutationPlan,
  ContentSource,
} from "@riebeckite/core";
import type { ContentLock } from "./file_system_content_migration_helpers.js";
import type {
  ContentMigrationAnalysis,
  ContentMigrationApplyOptions,
  ContentMigrationApplyResult,
  ContentMigrationPlan,
  ContentMigrationRecoverOptions,
  ContentMigrationRecoveryResult,
  ContentMigrationRollbackOptions,
  ContentMigrationRollbackOutcome,
  ContentMigrationStatusReport,
  FileSystemContentMigrationOptions,
} from "./file_system_content_migration_types.js";
import type { FileSystemContentMutation } from "./file_system_content_mutation.js";
import type { FileSystemContentSource } from "./file_system_content_source.js";

export interface MigrationContext {
  readonly options: FileSystemContentMigrationOptions;
  readonly mutation: FileSystemContentMutation;
  readonly source: FileSystemContentSource;
  readonly contentDirectory: string;
  plan(options?: {
    readonly ids?: readonly string[];
  }): Promise<ContentMigrationPlan>;
  savePlan(plan: ContentMigrationPlan, outputPath?: string): Promise<string>;
  loadPlan(planPath: string): Promise<ContentMigrationPlan>;
  history(options?: {
    readonly limit?: number;
  }): Promise<ContentMigrationHistory>;
  list(): Promise<readonly ContentMigrationListEntry[]>;
  apply(
    options?: ContentMigrationApplyOptions,
  ): Promise<ContentMigrationApplyResult>;
  status(): Promise<ContentMigrationStatusReport>;
  recover(
    options?: ContentMigrationRecoverOptions,
  ): Promise<ContentMigrationRecoveryResult>;
  rollback(
    options: ContentMigrationRollbackOptions,
  ): Promise<ContentMigrationRollbackOutcome>;
  reconcile(record: ContentMigrationRecord): Promise<ContentMigrationRecord>;
  preflight(
    plan: ContentMigrationPlan,
    state: ContentMigrationState,
  ): ContentMigrationDiagnostic[];
  stateWith(
    plan: ContentMigrationPlan,
    migrations: ContentMigrationPlan["migrations"],
    state: ContentMigrationState,
    status: ContentMigrationStatus,
    now: Date,
    extra?: {
      readonly journalPath?: string;
      readonly error?: string;
      readonly rolledBackAt?: string;
    },
  ): ContentMigrationState;
  supersede(
    migrations: ContentMigrationPlan["migrations"],
    state: ContentMigrationState,
    now: Date,
  ): ContentMigrationState;
  setStatuses(
    state: ContentMigrationState,
    records: readonly ContentMigrationRecord[],
    status: ContentMigrationStatus,
    now: Date,
    journalPath?: string,
    error?: string,
    rolledBackAt?: Date,
  ): ContentMigrationState;
  appendHistory(
    plan: ContentMigrationPlan,
    migrations: ContentMigrationPlan["migrations"],
    status: ContentMigrationHistoryStatus,
    recoveryState: ContentMigrationRecoveryState,
    journal: string | undefined,
  ): Promise<void>;
  appendHistoryForRecords(
    records: readonly ContentMigrationRecord[],
    status: ContentMigrationHistoryStatus,
    recoveryState: ContentMigrationRecoveryState,
    journal: string | undefined,
  ): Promise<void>;
  failedJournal(plan: ContentMigrationPlan): Promise<string | undefined>;
  currentContentFingerprint(): Promise<string>;
  readState(): Promise<ContentMigrationState>;
  writeState(state: ContentMigrationState): Promise<void>;
  readHistory(): Promise<ContentMigrationHistory>;
  writeHistory(history: ContentMigrationHistory): Promise<void>;
  relativeToContent(target: string): string;
  absoluteFromContent(target: string): string;
  acquireLock(): Promise<ContentLock>;
  tryAnalyze(source: ContentSource): Promise<{
    readonly analysis?: ContentMigrationAnalysis;
    readonly diagnostics: readonly ContentMigrationDiagnostic[];
  }>;
  analyze(source: ContentSource): Promise<{
    readonly manifest: ContentManifest;
    readonly locations: ReadonlyMap<string, { readonly permalink: string }>;
    readonly publicationFingerprint: string;
    readonly derivedViews: number;
  }>;
  redirectOperations(
    batch: ContentMigrationBatch,
    beforeManifest: ContentManifest,
    afterManifest: ContentManifest,
    field: string,
  ): ContentMutationOperation[];
  verify(input: {
    readonly batch: ContentMigrationBatch;
    readonly before: ContentMigrationAnalysis;
    readonly after: ContentMigrationAnalysis;
    readonly mutationPlan: ContentMutationPlan;
  }): { readonly diagnostics: readonly ContentMigrationDiagnostic[] };
}
