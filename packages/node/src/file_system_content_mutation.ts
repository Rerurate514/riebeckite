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

export class FileSystemContentMutation implements MutationContext {
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
    return await plan(this, operations);
  }

  async apply(plan: ContentMutationPlan): Promise<ContentMutationResult> {
    return await apply(this, plan);
  }

  async recover(journalPath: string): Promise<ContentMutationRecoveryResult> {
    return await recover(this, journalPath);
  }

  async rollback(journalPath: string): Promise<ContentMutationRollbackResult> {
    return await rollback(this, journalPath);
  }

  async restoreChange(
    root: string,
    journalDirectory: string,
    change: JournalChange,
    backup: Uint8Array | undefined,
    assertOwned: () => Promise<void>,
  ): Promise<ContentMutationIssue | null> {
    return await restoreChange(
      this,
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
    return await savePlan(this, plan, planPath);
  }

  async loadPlan(planPath: string): Promise<ContentMutationPlan> {
    return await loadPlan(this, planPath);
  }

  async revalidatePlan(
    plan: ContentMutationPlan,
  ): Promise<ContentMutationIssue[]> {
    return await revalidatePlan(this, plan);
  }

  async planPath(
    root: string,
    id: string | undefined,
    requested: string | undefined,
  ): Promise<string> {
    return await planPath(this, root, id, requested);
  }

  async root(): Promise<string> {
    return await root(this);
  }

  async loadFiles(
    root: string,
    relative: string,
    files: Map<string, FileState>,
  ): Promise<void> {
    return await loadFiles(this, root, relative, files);
  }

  async verifyPreconditions(
    root: string,
    changes: readonly ContentMutationFileChange[],
  ): Promise<ContentMutationIssue[]> {
    return await verifyPreconditions(this, root, changes);
  }

  async backup(
    root: string,
    journalDirectory: string,
    change: ContentMutationFileChange,
  ): Promise<JournalChange> {
    return await backup(this, root, journalDirectory, change);
  }

  async acquireLock(root: string): Promise<ContentLock> {
    return await acquireLock(this, root);
  }
}
