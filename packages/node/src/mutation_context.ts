import type {
  ContentMutationFileChange,
  ContentMutationIssue,
  ContentMutationOperation,
  ContentMutationPlan,
  ContentMutationRecoveryResult,
  ContentMutationResult,
  ContentMutationRollbackResult,
} from "@riebeckite/core";
import type { ContentLock } from "./file_system_content_migration_helpers.js";
import type { JournalChange } from "./mutation_journal.js";

export type FileState = {
  readonly content: Uint8Array;
  readonly fingerprint: string;
};

export type FileSystemContentMutationOptions = {
  readonly beforeWrite?: (path: string) => void | Promise<void>;
  readonly beforeRecoveryRestore?: (path: string) => void | Promise<void>;
  readonly afterRecoveryCapture?: (path: string) => void | Promise<void>;
  readonly isContentPath?: (path: string) => boolean;
  readonly toSlug?: (path: string) => string | undefined;
};

export interface MutationContext {
  readonly contentDirectory: string;
  readonly options: FileSystemContentMutationOptions;
  readonly isContentPath: (path: string) => boolean;
  plan(
    operations: readonly ContentMutationOperation[],
  ): Promise<ContentMutationPlan>;
  apply(plan: ContentMutationPlan): Promise<ContentMutationResult>;
  recover(journalPath: string): Promise<ContentMutationRecoveryResult>;
  rollback(journalPath: string): Promise<ContentMutationRollbackResult>;
  restoreChange(
    root: string,
    journalDirectory: string,
    change: JournalChange,
    backup: Uint8Array | undefined,
    assertOwned: () => Promise<void>,
  ): Promise<ContentMutationIssue | null>;
  savePlan(plan: ContentMutationPlan, planPath?: string): Promise<string>;
  loadPlan(planPath: string): Promise<ContentMutationPlan>;
  revalidatePlan(plan: ContentMutationPlan): Promise<ContentMutationIssue[]>;
  planPath(
    root: string,
    id: string | undefined,
    requested: string | undefined,
  ): Promise<string>;
  root(): Promise<string>;
  loadFiles(
    root: string,
    relative: string,
    files: Map<string, FileState>,
  ): Promise<void>;
  verifyPreconditions(
    root: string,
    changes: readonly ContentMutationFileChange[],
  ): Promise<ContentMutationIssue[]>;
  backup(
    root: string,
    journalDirectory: string,
    change: ContentMutationFileChange,
  ): Promise<JournalChange>;
  acquireLock(root: string): Promise<ContentLock>;
}
