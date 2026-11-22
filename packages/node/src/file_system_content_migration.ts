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

export class FileSystemContentMigration implements MigrationContext {
  readonly mutation: FileSystemContentMutation;
  readonly source: FileSystemContentSource;

  constructor(readonly options: FileSystemContentMigrationOptions) {
    this.mutation = new FileSystemContentMutation(options.contentDirectory);
    this.source = new FileSystemContentSource(options.contentDirectory);
  }

  get contentDirectory(): string {
    return contentDirectory(this);
  }

  plan(...args: RestArgs<typeof plan>) {
    return plan(this, ...args);
  }

  savePlan(...args: RestArgs<typeof savePlan>) {
    return savePlan(this, ...args);
  }

  loadPlan(...args: RestArgs<typeof loadPlan>) {
    return loadPlan(this, ...args);
  }

  history(...args: RestArgs<typeof history>): Promise<ContentMigrationHistory> {
    return history(this, ...args);
  }

  list(...args: RestArgs<typeof list>) {
    return list(this, ...args);
  }

  apply(...args: RestArgs<typeof apply>) {
    return apply(this, ...args);
  }

  status(...args: RestArgs<typeof status>) {
    return status(this, ...args);
  }

  recover(...args: RestArgs<typeof recover>) {
    return recover(this, ...args);
  }

  rollback(...args: RestArgs<typeof rollback>) {
    return rollback(this, ...args);
  }

  reconcile(...args: RestArgs<typeof reconcile>) {
    return reconcile(this, ...args);
  }

  preflight(...args: RestArgs<typeof preflight>) {
    return preflight(this, ...args);
  }

  stateWith(...args: RestArgs<typeof stateWith>) {
    return stateWith(this, ...args);
  }

  supersede(...args: RestArgs<typeof supersede>) {
    return supersede(this, ...args);
  }

  setStatuses(...args: RestArgs<typeof setStatuses>) {
    return setStatuses(this, ...args);
  }

  appendHistory(...args: RestArgs<typeof appendHistory>) {
    return appendHistory(this, ...args);
  }

  appendHistoryForRecords(...args: RestArgs<typeof appendHistoryForRecords>) {
    return appendHistoryForRecords(this, ...args);
  }

  failedJournal(...args: RestArgs<typeof failedJournal>) {
    return failedJournal(this, ...args);
  }

  currentContentFingerprint(
    ...args: RestArgs<typeof currentContentFingerprint>
  ) {
    return currentContentFingerprint(this, ...args);
  }

  readState(...args: RestArgs<typeof readState>) {
    return readState(this, ...args);
  }

  writeState(...args: RestArgs<typeof writeState>) {
    return writeState(this, ...args);
  }

  readHistory(...args: RestArgs<typeof readHistory>) {
    return readHistory(this, ...args);
  }

  writeHistory(...args: RestArgs<typeof writeHistory>) {
    return writeHistory(this, ...args);
  }

  relativeToContent(...args: RestArgs<typeof relativeToContent>) {
    return relativeToContent(this, ...args);
  }

  absoluteFromContent(...args: RestArgs<typeof absoluteFromContent>) {
    return absoluteFromContent(this, ...args);
  }

  acquireLock(...args: RestArgs<typeof acquireLock>) {
    return acquireLock(this, ...args);
  }

  tryAnalyze(...args: RestArgs<typeof tryAnalyze>) {
    return tryAnalyze(this, ...args);
  }

  analyze(...args: RestArgs<typeof analyze>) {
    return analyze(this, ...args);
  }

  redirectOperations(...args: RestArgs<typeof redirectOperations>) {
    return redirectOperations(this, ...args);
  }

  verify(...args: RestArgs<typeof verify>) {
    return verify(this, ...args);
  }
}

export {
  createFutureContentSource,
  fingerprintContentFiles,
} from "./migration_future.js";
