import type {
  ContentManifest,
  ContentMigrationBatch,
  ContentMigrationDiagnostic,
  ContentMigrationListEntry,
  ContentMigrationRegistry,
  ContentMigrationStatus,
  ContentMutationOperation,
  ContentSource,
  ResolvedRiebeckiteConfig,
  RiebeckitePlugin,
} from "@riebeckite/core";

export type FutureContentSource = ContentSource & {
  readonly changes: ReadonlyMap<string, Uint8Array | null>;
};

export type ContentMigrationAnalysis = {
  readonly manifest: ContentManifest;
  readonly locations: ReadonlyMap<string, { readonly permalink: string }>;
  readonly publicationFingerprint: string;
  readonly derivedViews: number;
};

export type ContentMigrationPlanFile = {
  readonly path: string;
  readonly beforeFingerprint: string | null;
  readonly afterFingerprint: string | null;
};

export type ContentMigrationVerification = {
  readonly beforeFiles: number;
  readonly afterFiles: number;
  readonly beforePublicationFingerprint: string;
  readonly afterPublicationFingerprint: string;
  readonly derivedViews: number;
};

export type ContentMigrationPlan = {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly createdAt: string;
  readonly migrations: readonly {
    readonly id: string;
    readonly version: number;
    readonly fingerprint: string;
  }[];
  readonly baseContentFingerprint: string;
  readonly mutationPlanId: string;
  readonly mutationPlanFingerprint: string;
  readonly planFingerprint: string;
  readonly operations: readonly ContentMutationOperation[];
  readonly changes: readonly ContentMigrationPlanFile[];
  readonly diagnostics: readonly ContentMigrationDiagnostic[];
  readonly conflicts: readonly ContentMigrationDiagnostic[];
  readonly selections: ContentMigrationBatch["selections"];
  readonly skipped: ContentMigrationBatch["skipped"];
  readonly impact: ContentMigrationBatch["impact"];
  readonly verification: ContentMigrationVerification;
};

export type FileSystemContentMigrationOptions = {
  readonly contentDirectory: string;
  readonly registry: ContentMigrationRegistry;
  readonly config?: ResolvedRiebeckiteConfig;
  readonly plugins?: readonly RiebeckitePlugin[];
  readonly buildTime?: Date;
  readonly exclude?: readonly string[];
  readonly redirectField?: string;
};

export type ContentMigrationApplyOptions = {
  readonly planPath?: string;
  readonly ids?: readonly string[];
};

export type ContentMigrationApplyResult = {
  readonly applied: boolean;
  readonly skipped: boolean;
  readonly plan: ContentMigrationPlan;
  readonly journalPath?: string;
  readonly changedPaths: readonly string[];
  readonly conflicts: readonly ContentMigrationDiagnostic[];
};

export type ContentMigrationStatusEntry = {
  readonly id: string;
  readonly version: number;
  readonly latestVersion?: number;
  readonly status: ContentMigrationStatus;
  readonly definitionMatches: boolean;
  readonly planId?: string;
  readonly appliedAt?: string;
  readonly updatedAt: string;
  readonly journal?: string;
  readonly error?: string;
};

export type ContentMigrationStatusReport = {
  readonly schemaVersion: 1;
  readonly updatedAt: string;
  readonly entries: readonly ContentMigrationStatusEntry[];
  readonly migrations: readonly ContentMigrationListEntry[];
  readonly historyCount: number;
};

export type ContentMigrationRecoverOptions = {
  readonly journal?: string;
  readonly migrationId?: string;
};

export type ContentMigrationRecoveryResult = {
  readonly recovered: boolean;
  readonly applied: boolean;
  readonly skipped: boolean;
  readonly restoredPaths: readonly string[];
  readonly conflicts: readonly ContentMigrationDiagnostic[];
};

export type ContentMigrationRollbackOptions = {
  readonly planId?: string;
  readonly migrationId?: string;
};

export type ContentMigrationRollbackOutcome = {
  readonly rolledBack: boolean;
  readonly skipped: boolean;
  readonly restoredPaths: readonly string[];
  readonly conflicts: readonly ContentMigrationDiagnostic[];
};
