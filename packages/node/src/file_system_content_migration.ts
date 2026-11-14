import type { ContentMigrationHistory } from "@riebeckite/core";
import type { FileSystemContentMigrationOptions } from "./file_system_content_migration_types.js";
import { FileSystemContentMutation } from "./file_system_content_mutation.js";
import { FileSystemContentSource } from "./file_system_content_source.js";
import { apply } from "./migration_apply.js";
import {
  analyze,
  preflight,
  redirectOperations,
  tryAnalyze,
  verify,
} from "./migration_checks.js";
import type { MigrationContext } from "./migration_context.js";
import { loadPlan, plan, savePlan } from "./migration_plan.js";
import { reconcile, recover } from "./migration_recover.js";
import { rollback } from "./migration_rollback.js";
import {
  absoluteFromContent,
  acquireLock,
  appendHistory,
  appendHistoryForRecords,
  contentDirectory,
  currentContentFingerprint,
  failedJournal,
  readHistory,
  readState,
  relativeToContent,
  setStatuses,
  stateWith,
  supersede,
  writeHistory,
  writeState,
} from "./migration_state.js";
import { history, list, status } from "./migration_status.js";

export type {
  ContentMigrationApplyOptions,
  ContentMigrationApplyResult,
  ContentMigrationPlan,
  ContentMigrationPlanFile,
  ContentMigrationRecoverOptions,
  ContentMigrationRecoveryResult,
  ContentMigrationRollbackOptions,
  ContentMigrationRollbackOutcome,
  ContentMigrationStatusEntry,
  ContentMigrationStatusReport,
  ContentMigrationVerification,
  FileSystemContentMigrationOptions,
  FutureContentSource,
} from "./file_system_content_migration_types.js";

type RestArgs<F> = F extends (m: MigrationContext, ...args: infer P) => unknown
  ? P
  : never;

export class FileSystemContentMigration {
  readonly mutation: FileSystemContentMutation;
  readonly source: FileSystemContentSource;

  constructor(readonly options: FileSystemContentMigrationOptions) {
    this.mutation = new FileSystemContentMutation(options.contentDirectory);
    this.source = new FileSystemContentSource(options.contentDirectory);
  }

  get contentDirectory(): string {
    return contentDirectory(this as unknown as MigrationContext);
  }

  plan(...args: RestArgs<typeof plan>) {
    return plan(this as unknown as MigrationContext, ...args);
  }

  savePlan(...args: RestArgs<typeof savePlan>) {
    return savePlan(this as unknown as MigrationContext, ...args);
  }

  loadPlan(...args: RestArgs<typeof loadPlan>) {
    return loadPlan(this as unknown as MigrationContext, ...args);
  }

  history(...args: RestArgs<typeof history>): Promise<ContentMigrationHistory> {
    return history(this as unknown as MigrationContext, ...args);
  }

  list(...args: RestArgs<typeof list>) {
    return list(this as unknown as MigrationContext, ...args);
  }

  apply(...args: RestArgs<typeof apply>) {
    return apply(this as unknown as MigrationContext, ...args);
  }

  status(...args: RestArgs<typeof status>) {
    return status(this as unknown as MigrationContext, ...args);
  }

  recover(...args: RestArgs<typeof recover>) {
    return recover(this as unknown as MigrationContext, ...args);
  }

  rollback(...args: RestArgs<typeof rollback>) {
    return rollback(this as unknown as MigrationContext, ...args);
  }

  reconcile(...args: RestArgs<typeof reconcile>) {
    return reconcile(this as unknown as MigrationContext, ...args);
  }

  preflight(...args: RestArgs<typeof preflight>) {
    return preflight(this as unknown as MigrationContext, ...args);
  }

  stateWith(...args: RestArgs<typeof stateWith>) {
    return stateWith(this as unknown as MigrationContext, ...args);
  }

  supersede(...args: RestArgs<typeof supersede>) {
    return supersede(this as unknown as MigrationContext, ...args);
  }

  setStatuses(...args: RestArgs<typeof setStatuses>) {
    return setStatuses(this as unknown as MigrationContext, ...args);
  }

  appendHistory(...args: RestArgs<typeof appendHistory>) {
    return appendHistory(this as unknown as MigrationContext, ...args);
  }

  appendHistoryForRecords(...args: RestArgs<typeof appendHistoryForRecords>) {
    return appendHistoryForRecords(
      this as unknown as MigrationContext,
      ...args,
    );
  }

  failedJournal(...args: RestArgs<typeof failedJournal>) {
    return failedJournal(this as unknown as MigrationContext, ...args);
  }

  currentContentFingerprint(
    ...args: RestArgs<typeof currentContentFingerprint>
  ) {
    return currentContentFingerprint(
      this as unknown as MigrationContext,
      ...args,
    );
  }

  readState(...args: RestArgs<typeof readState>) {
    return readState(this as unknown as MigrationContext, ...args);
  }

  writeState(...args: RestArgs<typeof writeState>) {
    return writeState(this as unknown as MigrationContext, ...args);
  }

  readHistory(...args: RestArgs<typeof readHistory>) {
    return readHistory(this as unknown as MigrationContext, ...args);
  }

  writeHistory(...args: RestArgs<typeof writeHistory>) {
    return writeHistory(this as unknown as MigrationContext, ...args);
  }

  relativeToContent(...args: RestArgs<typeof relativeToContent>) {
    return relativeToContent(this as unknown as MigrationContext, ...args);
  }

  absoluteFromContent(...args: RestArgs<typeof absoluteFromContent>) {
    return absoluteFromContent(this as unknown as MigrationContext, ...args);
  }

  acquireLock(...args: RestArgs<typeof acquireLock>) {
    return acquireLock(this as unknown as MigrationContext, ...args);
  }

  tryAnalyze(...args: RestArgs<typeof tryAnalyze>) {
    return tryAnalyze(this as unknown as MigrationContext, ...args);
  }

  analyze(...args: RestArgs<typeof analyze>) {
    return analyze(this as unknown as MigrationContext, ...args);
  }

  redirectOperations(...args: RestArgs<typeof redirectOperations>) {
    return redirectOperations(this as unknown as MigrationContext, ...args);
  }

  verify(...args: RestArgs<typeof verify>) {
    return verify(this as unknown as MigrationContext, ...args);
  }
}

export {
  createFutureContentSource,
  fingerprintContentFiles,
} from "./migration_future.js";
