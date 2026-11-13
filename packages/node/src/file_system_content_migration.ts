import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  appendContentMigrationHistory,
  ContentManager,
  type ContentManifest,
  type ContentMigrationBatch,
  type ContentMigrationDiagnostic,
  type ContentMigrationHistory,
  type ContentMigrationHistoryRun,
  type ContentMigrationHistoryStatus,
  type ContentMigrationListEntry,
  type ContentMigrationRecord,
  type ContentMigrationRecoveryState,
  type ContentMigrationState,
  type ContentMigrationStatus,
  type ContentMutationFileChange,
  type ContentMutationOperation,
  type ContentMutationPlan,
  type ContentMutationRollbackResult,
  type ContentSource,
  type ContentSourceEntry,
  findContentMigrationRecord,
  listContentMigrationEntries,
  planContentMigrationBatch,
  publicationEntriesFromManifest,
  publicationFingerprint,
  publicationOutputsFromManifest,
  publicationRedirectsFromManifest,
  sanitizeContentMigrationPath,
  upsertContentMigrationRecord,
} from "@riebeckite/core";
import {
  acquireContentLock,
  type ContentLock,
  changedFrontmatterKeys,
  diagnosticKey,
  errorMessage,
  errorPath,
  exists,
  findEntry,
  fingerprintFiles,
  fingerprintMutationPlan,
  fingerprintPlan,
  isAppliedRecord,
  isRecord,
  isWithin,
  journalMatchesApplied,
  mutationIssue,
  parseContentMigrationPlan,
  readJournalSnapshot,
  redirectFieldFromConfig,
  sameMigrationPlan,
  sanitizeErrorMessage,
} from "./file_system_content_migration_helpers.js";
import type {
  ContentMigrationApplyOptions,
  ContentMigrationApplyResult,
  ContentMigrationPlan,
  ContentMigrationRecoverOptions,
  ContentMigrationRecoveryResult,
  ContentMigrationRollbackOptions,
  ContentMigrationRollbackOutcome,
  ContentMigrationStatusReport,
  FileSystemContentMigrationOptions,
  FutureContentSource,
} from "./file_system_content_migration_types.js";
import { FileSystemContentMutation } from "./file_system_content_mutation.js";
import { FileSystemContentSource } from "./file_system_content_source.js";
import {
  migrationLockPath,
  readMigrationHistory,
  readMigrationState,
  writeMigrationHistory,
  writeMigrationState,
} from "./migration_state_store.js";

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

export class FileSystemContentMigration {
  private readonly mutation: FileSystemContentMutation;
  private readonly source: FileSystemContentSource;

  constructor(private readonly options: FileSystemContentMigrationOptions) {
    this.mutation = new FileSystemContentMutation(options.contentDirectory);
    this.source = new FileSystemContentSource(options.contentDirectory, [
      ...(options.config?.content.exclude ?? []),
      ...(options.exclude ?? []),
    ]);
  }

  private get contentDirectory(): string {
    return this.options.contentDirectory;
  }

  async plan(
    options: { readonly ids?: readonly string[] } = {},
  ): Promise<ContentMigrationPlan> {
    const migrations = this.options.registry.resolve(options.ids);
    const entries = (await this.source.scan()).filter((entry) =>
      entry.path.toLowerCase().endsWith(".md"),
    );
    const files = await Promise.all(
      entries.map(async (entry) => ({
        path: entry.path,
        content: await this.source.read(entry),
      })),
    );
    const baseContentFingerprint = fingerprintFiles(files);
    const redirectField =
      this.options.redirectField ??
      redirectFieldFromConfig(this.options.config);
    const batch = planContentMigrationBatch({
      migrations,
      files,
      preserveMovedPermalinks: false,
      redirectField,
    });
    const beforeOutcome = await this.tryAnalyze(this.source);
    let mutationPlan = await this.mutation.plan(batch.operations);
    let afterOutcome = beforeOutcome.analysis
      ? await this.tryAnalyze(
          createFutureContentSource(this.source, mutationPlan.changes),
        )
      : { analysis: undefined, diagnostics: [] };
    const diagnosticList: ContentMigrationDiagnostic[] = [
      ...beforeOutcome.diagnostics,
      ...afterOutcome.diagnostics,
    ];
    if (beforeOutcome.analysis && afterOutcome.analysis) {
      const redirectOperations = this.redirectOperations(
        batch,
        beforeOutcome.analysis.manifest,
        afterOutcome.analysis.manifest,
        redirectField,
      );
      if (redirectOperations.length > 0) {
        mutationPlan = await this.mutation.plan([
          ...batch.operations,
          ...redirectOperations,
        ]);
        afterOutcome = await this.tryAnalyze(
          createFutureContentSource(this.source, mutationPlan.changes),
        );
        diagnosticList.push(...afterOutcome.diagnostics);
      }
    }
    const verification =
      beforeOutcome.analysis && afterOutcome.analysis
        ? this.verify({
            batch,
            before: beforeOutcome.analysis,
            after: afterOutcome.analysis,
            mutationPlan,
          }).diagnostics
        : [];
    const diagnostics = [
      ...batch.diagnostics,
      ...mutationPlan.warnings.map((issue) => mutationIssue(issue, "warning")),
      ...diagnosticList,
      ...verification,
    ];
    const conflicts = [
      ...mutationPlan.conflicts.map((issue) => mutationIssue(issue, "error")),
      ...diagnostics.filter((diagnostic) => diagnostic.severity === "error"),
    ];
    const mutationChanges = mutationPlan.changes.map((change) => ({
      path: change.path,
      beforeFingerprint: change.beforeFingerprint,
      afterFingerprint: change.afterFingerprint,
    }));
    const mutationPlanFingerprint = fingerprintMutationPlan(
      mutationPlan.operations,
      mutationPlan.changes,
    );
    const planFingerprint = fingerprintPlan({
      migrations,
      baseContentFingerprint,
      mutationPlanFingerprint,
      operations: mutationPlan.operations,
      diagnostics,
      conflicts,
    });
    return {
      schemaVersion: 1,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      migrations: migrations.map((migration) => ({
        id: migration.id,
        version: migration.version,
        fingerprint: migration.fingerprint,
      })),
      baseContentFingerprint,
      mutationPlanId: mutationPlan.id,
      mutationPlanFingerprint,
      planFingerprint,
      operations: mutationPlan.operations,
      changes: mutationChanges,
      diagnostics,
      conflicts,
      selections: batch.selections,
      skipped: batch.skipped,
      impact: batch.impact,
      verification: {
        beforeFiles: beforeOutcome.analysis?.manifest.entries.length ?? 0,
        afterFiles: afterOutcome.analysis?.manifest.entries.length ?? 0,
        beforePublicationFingerprint:
          beforeOutcome.analysis?.publicationFingerprint ?? "",
        afterPublicationFingerprint:
          afterOutcome.analysis?.publicationFingerprint ?? "",
        derivedViews: afterOutcome.analysis?.derivedViews ?? 0,
      },
    };
  }

  async savePlan(
    plan: ContentMigrationPlan,
    outputPath?: string,
  ): Promise<string> {
    const target =
      outputPath ??
      path.join(
        this.options.contentDirectory,
        ".riebeckite",
        "migrations",
        "plans",
        `${plan.id}.json`,
      );
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
    return target;
  }

  async loadPlan(planPath: string): Promise<ContentMigrationPlan> {
    const content = await fs.readFile(planPath, "utf8");
    const parsed = JSON.parse(content) as unknown;
    if (!isRecord(parsed) || parsed.schemaVersion !== 1)
      throw new Error("The migration plan has an unsupported schema.");
    const plan = parseContentMigrationPlan(parsed);
    if (plan === undefined)
      throw new Error("The migration plan is missing or corrupt.");
    return plan;
  }

  async history(
    options: { readonly limit?: number } = {},
  ): Promise<ContentMigrationHistory> {
    const history = await this.readHistory();
    if (options.limit === undefined) return history;
    if (!Number.isInteger(options.limit) || options.limit < 0)
      throw new Error("The history limit must be a non-negative integer.");
    return {
      ...history,
      runs: history.runs.slice(-options.limit),
    };
  }

  async list(): Promise<readonly ContentMigrationListEntry[]> {
    return listContentMigrationEntries(
      this.options.registry.migrations,
      await this.readState(),
    );
  }

  async apply(
    options: ContentMigrationApplyOptions = {},
  ): Promise<ContentMigrationApplyResult> {
    const stored = options.planPath
      ? await this.loadPlan(options.planPath)
      : undefined;
    const requested = stored
      ? [...new Set(stored.migrations.map((migration) => migration.id))]
      : options.ids;
    const fresh = await this.plan({ ids: requested });
    if (stored && !sameMigrationPlan(stored, fresh))
      return {
        applied: false,
        skipped: false,
        plan: fresh,
        changedPaths: [],
        conflicts: [
          {
            severity: "error",
            code: "stale-plan",
            message:
              "The stored migration plan no longer matches the current content or migration definitions.",
          },
        ],
      };
    if (fresh.conflicts.length > 0)
      return {
        applied: false,
        skipped: false,
        plan: fresh,
        changedPaths: [],
        conflicts: fresh.conflicts,
      };

    let lock: ContentLock;
    try {
      lock = await this.acquireLock();
    } catch (error) {
      return {
        applied: false,
        skipped: false,
        plan: fresh,
        changedPaths: [],
        conflicts: [
          {
            severity: "error",
            code: "migration-locked",
            message: errorMessage(error),
          },
        ],
      };
    }
    try {
      const state = await this.readState();
      const conflicts = this.preflight(fresh, state);
      const currentContent = await this.currentContentFingerprint();
      if (currentContent !== fresh.baseContentFingerprint)
        conflicts.push({
          severity: "error",
          code: "stale-plan",
          message: "Content changed after the migration plan was created.",
        });
      if (conflicts.length > 0)
        return {
          applied: false,
          skipped: false,
          plan: fresh,
          changedPaths: [],
          conflicts,
        };

      const actionable = fresh.migrations.filter(
        (migration) =>
          !isAppliedRecord(
            findContentMigrationRecord(state, migration.id, migration.version),
            migration.fingerprint,
          ),
      );
      if (actionable.length === 0)
        return {
          applied: false,
          skipped: true,
          plan: fresh,
          changedPaths: [],
          conflicts: [],
        };

      const mutationPlan = await this.mutation.plan(fresh.operations);
      if (
        fingerprintMutationPlan(
          mutationPlan.operations,
          mutationPlan.changes,
        ) !== fresh.mutationPlanFingerprint
      )
        return {
          applied: false,
          skipped: false,
          plan: fresh,
          changedPaths: [],
          conflicts: [
            {
              severity: "error",
              code: "stale-plan",
              message:
                "The content mutation plan changed after the migration plan was created.",
            },
          ],
        };

      const now = new Date();
      let nextState = this.stateWith(fresh, actionable, state, "applying", now);
      await lock.assertOwned();
      await this.writeState(nextState);
      try {
        const result = await this.mutation.apply({
          ...mutationPlan,
          id: fresh.mutationPlanId,
        });
        if (!result.applied) {
          await lock.assertOwned();
          nextState = this.stateWith(
            fresh,
            actionable,
            nextState,
            "failed",
            new Date(),
            {
              error: result.conflicts
                .map((conflict) => conflict.message)
                .join(" "),
              journalPath: undefined,
            },
          );
          await this.writeState(nextState);
          await this.appendHistory(
            fresh,
            actionable,
            "failure",
            "required",
            undefined,
          );
          return {
            applied: false,
            skipped: false,
            plan: fresh,
            changedPaths: [],
            conflicts: result.conflicts.map((issue) =>
              mutationIssue(issue, "error"),
            ),
          };
        }
        const journalPath = result.journalPath
          ? this.relativeToContent(result.journalPath)
          : undefined;
        const appliedState = this.stateWith(
          fresh,
          actionable,
          nextState,
          "applied",
          new Date(),
          { journalPath, rolledBackAt: undefined },
        );
        nextState = this.supersede(actionable, appliedState, new Date());
        await lock.assertOwned();
        await this.writeState(nextState);
        await this.appendHistory(
          fresh,
          actionable,
          "success",
          "none",
          journalPath,
        );
        return {
          applied: true,
          skipped: false,
          plan: fresh,
          journalPath: result.journalPath,
          changedPaths: result.appliedPaths,
          conflicts: [],
        };
      } catch (error) {
        await lock.assertOwned();
        const journal = await this.failedJournal(fresh);
        const message = sanitizeErrorMessage(error, this.contentDirectory);
        nextState = this.stateWith(
          fresh,
          actionable,
          nextState,
          journal ? "recovery-required" : "failed",
          new Date(),
          { journalPath: journal, error: message },
        );
        await this.writeState(nextState);
        await this.appendHistory(
          fresh,
          actionable,
          "failure",
          journal ? "required" : "none",
          journal,
        );
        return {
          applied: false,
          skipped: false,
          plan: fresh,
          changedPaths: [],
          conflicts: [
            {
              severity: "error",
              code: journal ? "recovery-required" : "apply-failed",
              message,
            },
          ],
        };
      }
    } finally {
      await lock.release();
    }
  }

  async status(): Promise<ContentMigrationStatusReport> {
    const state = await this.readState();
    const history = await this.readHistory();
    const reconciled = new Map<string, ContentMigrationRecord>();
    for (const record of state.migrations) {
      const resolved = await this.reconcile(record);
      if (resolved !== record)
        reconciled.set(`${record.id}@${record.version}`, resolved);
    }
    let nextState = state;
    if (reconciled.size > 0) {
      try {
        const lock = await this.acquireLock();
        try {
          const current = await this.readState();
          let merged = current;
          for (const record of current.migrations) {
            const resolved = reconciled.get(`${record.id}@${record.version}`);
            const original = state.migrations.find(
              (entry) =>
                entry.id === record.id && entry.version === record.version,
            );
            if (
              resolved &&
              original &&
              record.status === original.status &&
              record.updatedAt === original.updatedAt
            )
              merged = upsertContentMigrationRecord(merged, resolved);
          }
          if (merged !== current) {
            await lock.assertOwned();
            await this.writeState(merged);
          }
          nextState = merged;
        } finally {
          await lock.release();
        }
      } catch {}
    }
    const entries = nextState.migrations
      .map((record) => {
        const definition = this.options.registry
          .versions(record.id)
          .find((migration) => migration.version === record.version);
        const latest = this.options.registry.latest(record.id);
        return {
          id: record.id,
          version: record.version,
          latestVersion: latest?.version,
          status: record.status,
          definitionMatches:
            definition !== undefined &&
            definition.fingerprint === record.definitionFingerprint,
          planId: record.planId,
          appliedAt: record.appliedAt,
          updatedAt: record.updatedAt,
          journal: record.journalPath,
          error: record.error,
        };
      })
      .toSorted(
        (left, right) =>
          left.id.localeCompare(right.id) || left.version - right.version,
      );
    return {
      schemaVersion: 1,
      updatedAt: nextState.updatedAt,
      entries,
      migrations: listContentMigrationEntries(
        this.options.registry.migrations,
        nextState,
      ),
      historyCount: history.runs.length,
    };
  }

  async recover(
    options: ContentMigrationRecoverOptions = {},
  ): Promise<ContentMigrationRecoveryResult> {
    const lock = await this.acquireLock();
    try {
      const state = await this.readState();
      const journalPath =
        options.journal !== undefined
          ? this.absoluteFromContent(options.journal)
          : undefined;
      if (
        journalPath !== undefined &&
        !isWithin(this.contentDirectory, journalPath)
      )
        throw new Error(
          `The migration journal "${options.journal}" is outside the content directory.`,
        );
      const targets = state.migrations.filter((record) => {
        if (options.journal !== undefined)
          return (
            record.journalPath === options.journal ||
            (record.mutationPlanId !== undefined &&
              journalPath !== undefined &&
              path.basename(path.dirname(journalPath)) ===
                record.mutationPlanId)
          );
        if (options.migrationId !== undefined)
          return (
            record.id === options.migrationId &&
            ["applying", "recovery-required", "failed"].includes(record.status)
          );
        return ["applying", "recovery-required", "failed"].includes(
          record.status,
        );
      });
      const journals = new Map<string, ContentMigrationRecord[]>();
      for (const record of targets) {
        const resolved =
          record.journalPath !== undefined
            ? this.absoluteFromContent(record.journalPath)
            : record.mutationPlanId !== undefined
              ? path.join(
                  this.contentDirectory,
                  ".riebeckite",
                  "mutations",
                  record.mutationPlanId,
                  "journal.json",
                )
              : undefined;
        if (!resolved || !(await exists(resolved))) continue;
        const records = journals.get(resolved) ?? [];
        records.push(record);
        journals.set(resolved, records);
      }
      if (journalPath !== undefined) {
        if (!(await exists(journalPath)))
          return {
            recovered: false,
            applied: false,
            skipped: false,
            restoredPaths: [],
            conflicts: [
              {
                severity: "error",
                code: "journal-missing",
                message: "The mutation journal does not exist.",
              },
            ],
          };
        if (!journals.has(journalPath)) journals.set(journalPath, []);
      }
      if (journals.size === 0)
        return {
          recovered: false,
          applied: false,
          skipped: true,
          restoredPaths: [],
          conflicts: [],
        };
      let nextState = state;
      let recovered = false;
      let applied = false;
      const restoredPaths: string[] = [];
      const conflicts: ContentMigrationDiagnostic[] = [];
      for (const [journal, records] of journals) {
        const relativeJournal = isWithin(this.contentDirectory, journal)
          ? this.relativeToContent(journal)
          : undefined;
        try {
          const result = await this.mutation.recover(journal);
          restoredPaths.push(...result.restoredPaths);
          if (result.conflicts.length > 0) {
            conflicts.push(
              ...result.conflicts.map((issue) => mutationIssue(issue, "error")),
            );
            nextState = this.setStatuses(
              nextState,
              records,
              "recovery-required",
              new Date(),
              relativeJournal,
            );
            await this.appendHistoryForRecords(
              records,
              "failure",
              "required",
              relativeJournal,
            );
            continue;
          }
          if (result.recovered) {
            recovered = true;
            nextState = this.setStatuses(
              nextState,
              records,
              "rolled-back",
              new Date(),
              relativeJournal,
            );
            await this.appendHistoryForRecords(
              records,
              "rolled-back",
              "recovered",
              relativeJournal,
            );
            continue;
          }
          const snapshot = await readJournalSnapshot(journal);
          if (
            snapshot?.state === "complete" &&
            (await journalMatchesApplied(this.contentDirectory, snapshot))
          ) {
            applied = true;
            nextState = this.setStatuses(
              nextState,
              records,
              "applied",
              new Date(),
              relativeJournal,
            );
            await this.appendHistoryForRecords(
              records,
              "success",
              "recovered",
              relativeJournal,
            );
          } else if (
            snapshot?.state === "rolled-back" ||
            snapshot?.state === "recovered"
          ) {
            recovered = true;
            nextState = this.setStatuses(
              nextState,
              records,
              "rolled-back",
              new Date(),
              relativeJournal,
            );
            await this.appendHistoryForRecords(
              records,
              "rolled-back",
              "recovered",
              relativeJournal,
            );
          } else {
            nextState = this.setStatuses(
              nextState,
              records,
              "recovery-required",
              new Date(),
              relativeJournal,
            );
            conflicts.push({
              severity: "error",
              code: "journal-not-recoverable",
              message: "The mutation journal is not in a recoverable state.",
            });
          }
        } catch (error) {
          conflicts.push({
            severity: "error",
            code: "recovery-failed",
            message: errorMessage(error),
          });
          nextState = this.setStatuses(
            nextState,
            records,
            "recovery-required",
            new Date(),
            relativeJournal,
          );
          await this.appendHistoryForRecords(
            records,
            "failure",
            "required",
            relativeJournal,
          );
        }
      }
      await lock.assertOwned();
      await this.writeState(nextState);
      return {
        recovered,
        applied,
        skipped: false,
        restoredPaths,
        conflicts,
      };
    } finally {
      await lock.release();
    }
  }

  async rollback(
    options: ContentMigrationRollbackOptions,
  ): Promise<ContentMigrationRollbackOutcome> {
    const lock = await this.acquireLock();
    try {
      const state = await this.readState();
      const candidates = state.migrations.filter((record) =>
        options.planId !== undefined
          ? record.planId === options.planId
          : options.migrationId !== undefined
            ? record.id === options.migrationId
            : false,
      );
      const target = candidates
        .filter((record) => record.status === "applied")
        .toSorted((left, right) => right.version - left.version)[0];
      if (!target) {
        if (candidates.some((record) => record.status === "rolled-back"))
          return {
            rolledBack: false,
            skipped: true,
            restoredPaths: [],
            conflicts: [],
          };
        return {
          rolledBack: false,
          skipped: false,
          restoredPaths: [],
          conflicts: [
            {
              severity: "error",
              code: "rollback-not-applied",
              message: "The migration has no applied state to roll back.",
            },
          ],
        };
      }
      if (!target.journalPath)
        return {
          rolledBack: false,
          skipped: false,
          restoredPaths: [],
          conflicts: [
            {
              severity: "error",
              code: "rollback-journal-missing",
              message: "The applied migration has no mutation journal.",
            },
          ],
        };
      const batch = state.migrations.filter(
        (record) =>
          record.status === "applied" &&
          record.planId !== undefined &&
          record.planId === target.planId,
      );
      const journal = this.absoluteFromContent(target.journalPath);
      let result: ContentMutationRollbackResult;
      try {
        result = await this.mutation.rollback(journal);
      } catch (error) {
        return {
          rolledBack: false,
          skipped: false,
          restoredPaths: [],
          conflicts: [
            {
              severity: "error",
              code: "rollback-failed",
              message: errorMessage(error),
            },
          ],
        };
      }
      if (result.conflicts.length > 0) {
        await lock.assertOwned();
        const nextState = this.setStatuses(
          state,
          batch,
          "recovery-required",
          new Date(),
          target.journalPath,
          sanitizeErrorMessage(
            result.conflicts.map((issue) => issue.message).join(" "),
            this.contentDirectory,
          ),
        );
        await this.writeState(nextState);
        await this.appendHistoryForRecords(
          batch,
          "failure",
          "required",
          target.journalPath,
        );
        return {
          rolledBack: false,
          skipped: false,
          restoredPaths: result.restoredPaths,
          conflicts: result.conflicts.map((issue) =>
            mutationIssue(issue, "error"),
          ),
        };
      }
      const nextState = this.setStatuses(
        state,
        batch,
        "rolled-back",
        new Date(),
        target.journalPath,
        undefined,
        new Date(),
      );
      await lock.assertOwned();
      await this.writeState(nextState);
      await this.appendHistoryForRecords(
        batch,
        "rolled-back",
        "recovered",
        target.journalPath,
      );
      return {
        rolledBack: result.rolledBack,
        skipped: result.skipped,
        restoredPaths: result.restoredPaths,
        conflicts: [],
      };
    } finally {
      await lock.release();
    }
  }

  private async reconcile(
    record: ContentMigrationRecord,
  ): Promise<ContentMigrationRecord> {
    if (record.status !== "applying") return record;
    const journal = record.journalPath
      ? this.absoluteFromContent(record.journalPath)
      : record.mutationPlanId
        ? path.join(
            this.contentDirectory,
            ".riebeckite",
            "mutations",
            record.mutationPlanId,
            "journal.json",
          )
        : undefined;
    const snapshot = journal ? await readJournalSnapshot(journal) : undefined;
    if (!snapshot)
      return {
        ...record,
        status: "failed",
        updatedAt: new Date().toISOString(),
        ...(journal ? { journalPath: this.relativeToContent(journal) } : {}),
        error: "The mutation journal is missing.",
      };
    const relative = this.relativeToContent(journal as string);
    if (snapshot.state === "complete") {
      if (await journalMatchesApplied(this.contentDirectory, snapshot))
        return {
          ...record,
          status: "applied",
          journalPath: relative,
          appliedAt: record.appliedAt ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      return {
        ...record,
        status: "recovery-required",
        journalPath: relative,
        updatedAt: new Date().toISOString(),
        error: "Content changed after the mutation journal completed.",
      };
    }
    if (snapshot.state === "rolled-back" || snapshot.state === "recovered")
      return {
        ...record,
        status: "rolled-back",
        journalPath: relative,
        rolledBackAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    return {
      ...record,
      status: "recovery-required",
      journalPath: relative,
      updatedAt: new Date().toISOString(),
    };
  }

  private preflight(
    plan: ContentMigrationPlan,
    state: ContentMigrationState,
  ): ContentMigrationDiagnostic[] {
    const conflicts: ContentMigrationDiagnostic[] = [];
    for (const migration of plan.migrations) {
      const records = state.migrations.filter(
        (record) => record.id === migration.id,
      );
      const sameVersion = records.find(
        (record) => record.version === migration.version,
      );
      if (
        sameVersion?.status === "applied" &&
        sameVersion.definitionFingerprint !== migration.fingerprint
      )
        conflicts.push({
          severity: "error",
          code: "migration-definition-changed",
          message: `Migration "${migration.id}" changed without a version bump.`,
          path: undefined,
        });
      const higher = records.find(
        (record) =>
          record.version > migration.version && record.status === "applied",
      );
      if (higher)
        conflicts.push({
          severity: "error",
          code: "migration-version-regressed",
          message: `Migration "${migration.id}" version ${migration.version} is older than the applied version ${higher.version}.`,
        });
      if (
        records.some(
          (record) =>
            record.version === migration.version &&
            record.status === "applying",
        )
      )
        conflicts.push({
          severity: "error",
          code: "migration-in-progress",
          message: `Migration "${migration.id}" is still applying; recover it first.`,
        });
      if (
        records.some(
          (record) =>
            record.version === migration.version &&
            record.status === "recovery-required",
        )
      )
        conflicts.push({
          severity: "error",
          code: "recovery-required",
          message: `Migration "${migration.id}" requires recovery before it can be applied again.`,
        });
    }
    return conflicts;
  }

  private stateWith(
    plan: ContentMigrationPlan,
    migrations: ContentMigrationPlan["migrations"],
    state: ContentMigrationState,
    status: ContentMigrationStatus,
    now: Date,
    extra: {
      readonly journalPath?: string;
      readonly error?: string;
      readonly rolledBackAt?: string;
    } = {},
  ): ContentMigrationState {
    let next = state;
    for (const migration of migrations) {
      const prior = findContentMigrationRecord(
        state,
        migration.id,
        migration.version,
      );
      next = upsertContentMigrationRecord(
        next,
        {
          id: migration.id,
          version: migration.version,
          definitionFingerprint: migration.fingerprint,
          status,
          planId: plan.id,
          planFingerprint: plan.planFingerprint,
          contentFingerprint: plan.baseContentFingerprint,
          mutationPlanId: plan.mutationPlanId,
          mutationPlanFingerprint: plan.mutationPlanFingerprint,
          journalPath: extra.journalPath ?? prior?.journalPath,
          changedPaths: plan.changes.map((change) => change.path),
          updatedAt: now.toISOString(),
          appliedAt:
            status === "applied"
              ? (prior?.appliedAt ?? now.toISOString())
              : prior?.appliedAt,
          rolledBackAt: extra.rolledBackAt ?? prior?.rolledBackAt,
          error: extra.error,
        },
        now,
      );
    }
    return next;
  }

  private supersede(
    migrations: ContentMigrationPlan["migrations"],
    state: ContentMigrationState,
    now: Date,
  ): ContentMigrationState {
    let next = state;
    for (const migration of migrations) {
      for (const record of state.migrations) {
        if (
          record.id === migration.id &&
          record.version < migration.version &&
          record.status === "applied"
        )
          next = upsertContentMigrationRecord(
            next,
            {
              ...record,
              status: "superseded",
              updatedAt: now.toISOString(),
            },
            now,
          );
      }
    }
    return next;
  }

  private setStatuses(
    state: ContentMigrationState,
    records: readonly ContentMigrationRecord[],
    status: ContentMigrationStatus,
    now: Date,
    journalPath?: string,
    error?: string,
    rolledBackAt?: Date,
  ): ContentMigrationState {
    const keys = new Set(
      records.map((record) => `${record.id}@${record.version}`),
    );
    let next = state;
    for (const record of state.migrations) {
      if (!keys.has(`${record.id}@${record.version}`)) continue;
      next = upsertContentMigrationRecord(
        next,
        {
          ...record,
          status,
          journalPath: journalPath ?? record.journalPath,
          updatedAt: now.toISOString(),
          appliedAt:
            status === "applied"
              ? (record.appliedAt ?? now.toISOString())
              : record.appliedAt,
          rolledBackAt: rolledBackAt?.toISOString() ?? record.rolledBackAt,
          error,
        },
        now,
      );
    }
    return next;
  }

  private async appendHistory(
    plan: ContentMigrationPlan,
    migrations: ContentMigrationPlan["migrations"],
    status: ContentMigrationHistoryStatus,
    recoveryState: ContentMigrationRecoveryState,
    journal: string | undefined,
  ): Promise<void> {
    if (migrations.length === 0) return;
    const created = plan.changes.filter(
      (change) => change.beforeFingerprint === null,
    ).length;
    const deleted = plan.changes.filter(
      (change) => change.afterFingerprint === null,
    ).length;
    const updated = plan.changes.length - created - deleted;
    const history = await this.readHistory();
    let next = history;
    for (const migration of migrations) {
      const run: ContentMigrationHistoryRun = {
        id: migration.id,
        version: migration.version,
        at: new Date().toISOString(),
        planId: plan.id,
        mutationPlanId: plan.mutationPlanId,
        planFingerprint: plan.planFingerprint,
        contentFingerprint: plan.baseContentFingerprint,
        mutationPlanFingerprint: plan.mutationPlanFingerprint,
        status,
        created,
        updated,
        deleted,
        moved: plan.impact.moved,
        changedCount: plan.changes.length,
        recoveryState,
        journal,
      };
      next = appendContentMigrationHistory(next, run);
    }
    await this.writeHistory(next);
  }

  private async appendHistoryForRecords(
    records: readonly ContentMigrationRecord[],
    status: ContentMigrationHistoryStatus,
    recoveryState: ContentMigrationRecoveryState,
    journal: string | undefined,
  ): Promise<void> {
    if (records.length === 0) return;
    const history = await this.readHistory();
    let next = history;
    for (const record of records) {
      if (!record.planId) continue;
      const run: ContentMigrationHistoryRun = {
        id: record.id,
        version: record.version,
        at: new Date().toISOString(),
        planId: record.planId,
        mutationPlanId: record.mutationPlanId,
        planFingerprint: record.planFingerprint ?? "",
        contentFingerprint: record.contentFingerprint ?? "",
        mutationPlanFingerprint: record.mutationPlanFingerprint,
        status,
        created: 0,
        updated: 0,
        deleted: 0,
        moved: 0,
        changedCount: record.changedPaths.length,
        recoveryState,
        journal,
      };
      next = appendContentMigrationHistory(next, run);
    }
    await this.writeHistory(next);
  }

  private async failedJournal(
    plan: ContentMigrationPlan,
  ): Promise<string | undefined> {
    const journal = path.join(
      this.contentDirectory,
      ".riebeckite",
      "mutations",
      plan.mutationPlanId,
      "journal.json",
    );
    try {
      await fs.access(journal);
      return this.relativeToContent(journal);
    } catch {
      return undefined;
    }
  }

  private async currentContentFingerprint(): Promise<string> {
    const entries = (await this.source.scan()).filter((entry) =>
      entry.path.toLowerCase().endsWith(".md"),
    );
    return fingerprintContentFiles(
      await Promise.all(
        entries.map(async (entry) => ({
          path: entry.path,
          content: await this.source.read(entry),
        })),
      ),
    );
  }

  private async readState(): Promise<ContentMigrationState> {
    return readMigrationState(this.contentDirectory);
  }

  private async writeState(state: ContentMigrationState): Promise<void> {
    return writeMigrationState(this.contentDirectory, state);
  }

  private async readHistory(): Promise<ContentMigrationHistory> {
    return readMigrationHistory(this.contentDirectory);
  }

  private async writeHistory(history: ContentMigrationHistory): Promise<void> {
    return writeMigrationHistory(this.contentDirectory, history);
  }

  private relativeToContent(target: string): string {
    return sanitizeContentMigrationPath(
      path.relative(this.contentDirectory, target).split(path.sep).join("/"),
    );
  }

  private absoluteFromContent(target: string): string {
    return path.isAbsolute(target)
      ? target
      : path.join(this.contentDirectory, target);
  }

  private async acquireLock(): Promise<ContentLock> {
    return await acquireContentLock(
      migrationLockPath(this.contentDirectory),
      "Another migration is already applying or requires recovery.",
    );
  }

  private async tryAnalyze(source: ContentSource): Promise<{
    readonly analysis?: Awaited<
      ReturnType<FileSystemContentMigration["analyze"]>
    >;
    readonly diagnostics: readonly ContentMigrationDiagnostic[];
  }> {
    try {
      return { analysis: await this.analyze(source), diagnostics: [] };
    } catch (error) {
      const path = errorPath(error);
      return {
        diagnostics: [
          {
            severity: "error",
            code: "manifest-build-failed",
            message: `The content manifest could not be built: ${errorMessage(error)}`,
            ...(path === undefined ? {} : { path }),
          },
        ],
      };
    }
  }

  private async analyze(source: ContentSource): Promise<{
    readonly manifest: ContentManifest;
    readonly locations: ReadonlyMap<string, { readonly permalink: string }>;
    readonly publicationFingerprint: string;
    readonly derivedViews: number;
  }> {
    const manager = new ContentManager(source, [], {
      config: this.options.config,
      plugins: this.options.plugins ? [...this.options.plugins] : undefined,
      commitBuildState: false,
      publishingBuildTime: this.options.buildTime,
    });
    try {
      const manifest = await manager.getManifest();
      const locations = await manager.getContentLocations();
      const snapshot = manager.getCompletedBuildSnapshot();
      return {
        manifest,
        locations,
        publicationFingerprint: publicationFingerprint(
          publicationEntriesFromManifest(manifest),
          publicationRedirectsFromManifest(manifest),
          publicationOutputsFromManifest(manifest),
        ),
        derivedViews: snapshot?.derivedViews.length ?? 0,
      };
    } finally {
      await manager.dispose();
    }
  }

  private redirectOperations(
    batch: ContentMigrationBatch,
    beforeManifest: ContentManifest,
    afterManifest: ContentManifest,
    field: string,
  ): ContentMutationOperation[] {
    const operations: ContentMutationOperation[] = [];
    for (const file of batch.files) {
      if (file.originalPath === file.path) continue;
      const beforeEntry = findEntry(beforeManifest, file.originalPath);
      const afterEntry = findEntry(afterManifest, file.path);
      if (
        !beforeEntry ||
        !afterEntry ||
        beforeEntry.permalink === afterEntry.permalink
      )
        continue;
      const current = file.frontmatter[field];
      const redirects =
        typeof current === "string"
          ? [current]
          : Array.isArray(current)
            ? current.filter(
                (entry): entry is string => typeof entry === "string",
              )
            : [];
      if (redirects.includes(beforeEntry.permalink)) continue;
      operations.push({
        kind: "frontmatter",
        path: file.path,
        set: { [field]: [...redirects, beforeEntry.permalink] },
        remove: [],
      });
    }
    return operations;
  }

  private verify(input: {
    readonly batch: ContentMigrationBatch;
    readonly before: Awaited<ReturnType<FileSystemContentMigration["analyze"]>>;
    readonly after: Awaited<ReturnType<FileSystemContentMigration["analyze"]>>;
    readonly mutationPlan: ContentMutationPlan;
  }): { readonly diagnostics: readonly ContentMigrationDiagnostic[] } {
    const diagnostics: ContentMigrationDiagnostic[] = [];
    const beforeDiagnostics = new Set(
      input.before.manifest.diagnostics.map(diagnosticKey),
    );
    for (const diagnostic of input.after.manifest.diagnostics) {
      if (diagnostic.severity !== "error") continue;
      if (beforeDiagnostics.has(diagnosticKey(diagnostic))) continue;
      diagnostics.push({
        severity: "error",
        code: diagnostic.code,
        message: diagnostic.message,
        path: diagnostic.filePath,
      });
    }

    const permalinks = new Map<string, string>();
    for (const entry of input.after.manifest.entries) {
      const existing = permalinks.get(entry.permalink);
      if (existing !== undefined) {
        diagnostics.push({
          severity: "error",
          code: "permalink-collision",
          message: `Content "${existing}" and "${entry.slug}" share the permalink "${entry.permalink}".`,
        });
      } else permalinks.set(entry.permalink, entry.slug);
    }

    for (const file of input.batch.files) {
      const beforeEntry = findEntry(input.before.manifest, file.originalPath);
      const afterEntry = findEntry(input.after.manifest, file.path);
      if (!afterEntry) {
        diagnostics.push({
          severity: "error",
          code: "manifest-entry-missing",
          message: "The migrated content is missing from the future manifest.",
          path: file.path,
        });
        continue;
      }
      if (!beforeEntry) continue;
      const changed = changedFrontmatterKeys(file);
      if (
        beforeEntry.contentId !== afterEntry.contentId &&
        file.frontmatter.id === file.originalFrontmatter.id
      )
        diagnostics.push({
          severity: "error",
          code: "content-id-changed",
          message:
            "The migration changed the content ID without an explicit id rule.",
          path: file.path,
        });
      if (
        beforeEntry.publishing.visibility !==
          afterEntry.publishing.visibility &&
        !changed.has("visibility") &&
        !changed.has("published") &&
        !changed.has("publish") &&
        !changed.has("private") &&
        !changed.has("draft") &&
        !changed.has("publishAt")
      )
        diagnostics.push({
          severity: "error",
          code: "visibility-changed",
          message:
            "The migration changed the publishing visibility without an explicit rule.",
          path: file.path,
        });
      if (
        beforeEntry.permalink !== afterEntry.permalink &&
        (beforeEntry.publishing.visibility === "public" ||
          beforeEntry.publishing.visibility === "unlisted") &&
        !input.after.manifest.redirects.has(beforeEntry.permalink)
      )
        diagnostics.push({
          severity: "error",
          code: "permalink-redirect-missing",
          message: `The previous permalink "${beforeEntry.permalink}" has no redirect.`,
          path: file.path,
        });
    }
    return { diagnostics };
  }
}

export function createFutureContentSource(
  base: ContentSource,
  changes: readonly ContentMutationFileChange[],
): FutureContentSource {
  const map = new Map<string, Uint8Array | null>();
  for (const change of changes) map.set(change.path, change.content);
  return {
    changes: map,
    async scan(): Promise<ContentSourceEntry[]> {
      const entries = new Map<string, ContentSourceEntry>();
      for (const entry of await base.scan()) entries.set(entry.path, entry);
      for (const [changePath, content] of map) {
        if (content === null) entries.delete(changePath);
        else
          entries.set(changePath, {
            path: changePath,
            metadata: entries.get(changePath)?.metadata,
          });
      }
      return [...entries.values()].sort((left, right) =>
        left.path.localeCompare(right.path),
      );
    },
    async read(entry: ContentSourceEntry): Promise<string | Uint8Array> {
      const content = map.get(entry.path);
      if (content === null)
        throw new Error(`The content path "${entry.path}" was deleted.`);
      if (content !== undefined) return content;
      return await base.read(entry);
    },
  };
}

export function fingerprintContentFiles(
  files: readonly {
    readonly path: string;
    readonly content: string | Uint8Array;
  }[],
): string {
  return fingerprintFiles(files);
}
