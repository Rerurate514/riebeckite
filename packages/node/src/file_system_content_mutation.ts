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

export type {
  FileState,
  FileSystemContentMutationOptions,
} from "./mutation_context.js";

import { apply, restoreChange } from "./mutation_apply.js";
import type {
  FileState,
  FileSystemContentMutationOptions,
  MutationContext,
} from "./mutation_context.js";
import { plan, planPath, revalidatePlan } from "./mutation_plan.js";
import { recover } from "./mutation_recover.js";
import { rollback } from "./mutation_rollback.js";
import {
  acquireLock,
  backup,
  loadFiles,
  loadPlan,
  root,
  savePlan,
  verifyPreconditions,
} from "./mutation_state.js";

export class FileSystemContentMutation {
  readonly isContentPath: (path: string) => boolean;

  constructor(
    readonly contentDirectory: string,
    readonly options: FileSystemContentMutationOptions = {},
  ) {
    this.isContentPath = (path) =>
      this.options.isContentPath?.(path) ?? path.toLowerCase().endsWith(".md");
  }

  async plan(
    operations: readonly ContentMutationOperation[],
  ): Promise<ContentMutationPlan> {
    return await plan(this as MutationContext, operations);
  }

  async apply(plan: ContentMutationPlan): Promise<ContentMutationResult> {
    return await apply(this as MutationContext, plan);
  }

  async recover(journalPath: string): Promise<ContentMutationRecoveryResult> {
    return await recover(this as MutationContext, journalPath);
  }

  async rollback(journalPath: string): Promise<ContentMutationRollbackResult> {
    return await rollback(this as MutationContext, journalPath);
  }

  async restoreChange(
    root: string,
    journalDirectory: string,
    change: JournalChange,
    backup: Uint8Array | undefined,
    assertOwned: () => Promise<void>,
  ): Promise<ContentMutationIssue | null> {
    return await restoreChange(
      this as MutationContext,
      root,
      journalDirectory,
      change,
      backup,
      assertOwned,
    );
  }

  async savePlan(
    plan: ContentMutationPlan,
    planPath?: string,
  ): Promise<string> {
    return await savePlan(this as MutationContext, plan, planPath);
  }

  async loadPlan(planPath: string): Promise<ContentMutationPlan> {
    return await loadPlan(this as MutationContext, planPath);
  }

  async revalidatePlan(
    plan: ContentMutationPlan,
  ): Promise<ContentMutationIssue[]> {
    return await revalidatePlan(this as MutationContext, plan);
  }

  async planPath(
    root: string,
    id: string | undefined,
    requested: string | undefined,
  ): Promise<string> {
    return await planPath(this as MutationContext, root, id, requested);
  }

  async root(): Promise<string> {
    return await root(this as MutationContext);
  }

  async loadFiles(
    root: string,
    relative: string,
    files: Map<string, FileState>,
  ): Promise<void> {
    return await loadFiles(this as MutationContext, root, relative, files);
  }

  async verifyPreconditions(
    root: string,
    changes: readonly ContentMutationFileChange[],
  ): Promise<ContentMutationIssue[]> {
    return await verifyPreconditions(this as MutationContext, root, changes);
  }

  async backup(
    root: string,
    journalDirectory: string,
    change: ContentMutationFileChange,
  ): Promise<JournalChange> {
    return await backup(
      this as MutationContext,
      root,
      journalDirectory,
      change,
    );
  }

  async acquireLock(root: string): Promise<ContentLock> {
    return await acquireLock(this as MutationContext, root);
  }
}
