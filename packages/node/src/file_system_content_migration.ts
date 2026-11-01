import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  appendContentMigrationHistory,
  ContentManager,
  type ContentManifest,
  type ContentManifestEntry,
  type ContentMigrationBatch,
  type ContentMigrationDiagnostic,
  type ContentMigrationHistory,
  type ContentMigrationHistoryRun,
  type ContentMigrationHistoryStatus,
  type ContentMigrationListEntry,
  type ContentMigrationRecord,
  type ContentMigrationRecoveryState,
  type ContentMigrationRegistry,
  type ContentMigrationState,
  type ContentMigrationStatus,
  type ContentMutationFileChange,
  type ContentMutationOperation,
  type ContentMutationPlan,
  type ContentMutationRollbackResult,
  type ContentSource,
  type ContentSourceEntry,
  emptyContentMigrationHistory,
  emptyContentMigrationState,
  findContentMigrationRecord,
  listContentMigrationEntries,
  parseContentMigrationHistory,
  parseContentMigrationState,
  planContentMigrationBatch,
  publicationEntriesFromManifest,
  publicationFingerprint,
  publicationOutputsFromManifest,
  publicationRedirectsFromManifest,
  type ResolvedRiebeckiteConfig,
  type RiebeckitePlugin,
  sanitizeContentMigrationPath,
  upsertContentMigrationRecord,
} from "@riebeckite/core";
import { FileSystemContentMutation } from "./file_system_content_mutation.js";
import { FileSystemContentSource } from "./file_system_content_source.js";

export type FutureContentSource = ContentSource & {
  readonly changes: ReadonlyMap<string, Uint8Array | null>;
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
    return parsed as unknown as ContentMigrationPlan;
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

    let release: () => Promise<void>;
    try {
      release = await this.acquireLock();
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
      await this.writeState(nextState);
      try {
        const result = await this.mutation.apply({
          ...mutationPlan,
          id: fresh.mutationPlanId,
        });
        if (!result.applied) {
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
      await release();
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
        const release = await this.acquireLock();
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
          if (merged !== current) await this.writeState(merged);
          nextState = merged;
        } finally {
          await release();
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
    const release = await this.acquireLock();
    try {
      const state = await this.readState();
      const journalPath =
        options.journal !== undefined
          ? this.absoluteFromContent(options.journal)
          : undefined;
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
      await this.writeState(nextState);
      return {
        recovered,
        applied,
        skipped: false,
        restoredPaths,
        conflicts,
      };
    } finally {
      await release();
    }
  }

  async rollback(
    options: ContentMigrationRollbackOptions,
  ): Promise<ContentMigrationRollbackOutcome> {
    const release = await this.acquireLock();
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
      await release();
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
    try {
      return parseContentMigrationState(
        JSON.parse(await fs.readFile(this.statePath(), "utf8")) as unknown,
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT")
        return emptyContentMigrationState();
      throw error;
    }
  }

  private async writeState(state: ContentMigrationState): Promise<void> {
    const target = this.statePath();
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  }

  private async readHistory(): Promise<ContentMigrationHistory> {
    try {
      return parseContentMigrationHistory(
        JSON.parse(await fs.readFile(this.historyPath(), "utf8")) as unknown,
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT")
        return emptyContentMigrationHistory();
      throw error;
    }
  }

  private async writeHistory(history: ContentMigrationHistory): Promise<void> {
    const target = this.historyPath();
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, `${JSON.stringify(history, null, 2)}\n`, "utf8");
  }

  private statePath(): string {
    return path.join(
      this.contentDirectory,
      ".riebeckite",
      "migrations",
      "state.json",
    );
  }

  private historyPath(): string {
    return path.join(
      this.contentDirectory,
      ".riebeckite",
      "migrations",
      "history.json",
    );
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

  private async acquireLock(): Promise<() => Promise<void>> {
    const lockPath = path.join(
      this.contentDirectory,
      ".riebeckite",
      "migrations",
      "lock",
    );
    await fs.mkdir(path.dirname(lockPath), { recursive: true });
    let handle: fs.FileHandle | undefined;
    for (let attempt = 0; attempt < 3 && !handle; attempt += 1) {
      try {
        handle = await fs.open(lockPath, "wx");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        const stale = await staleLockContent(lockPath);
        if (stale === null)
          throw new Error(
            "Another migration is already applying or requires recovery.",
          );
        const quarantine = `${lockPath}.stale-${randomUUID()}`;
        try {
          await fs.rename(lockPath, quarantine);
        } catch (renameError) {
          if ((renameError as NodeJS.ErrnoException).code === "ENOENT")
            continue;
          throw renameError;
        }
        const quarantined = await fs.readFile(quarantine, "utf8");
        if (quarantined !== stale) {
          await fs.writeFile(lockPath, quarantined, { flag: "wx" }).then(
            () => undefined,
            () => undefined,
          );
          await fs.rm(quarantine, { force: true });
          throw new Error(
            "Another migration is already applying or requires recovery.",
          );
        }
        await fs.rm(quarantine, { force: true });
      }
    }
    if (!handle)
      throw new Error(
        "Another migration is already applying or requires recovery.",
      );
    const token = randomUUID();
    await handle.writeFile(
      JSON.stringify({
        pid: process.pid,
        token,
        startedAt: new Date().toISOString(),
      }),
    );
    return async () => {
      await handle.close();
      try {
        const current = JSON.parse(await fs.readFile(lockPath, "utf8"));
        if (isRecord(current) && current.token === token)
          await fs.rm(lockPath, { force: true });
      } catch {}
    };
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

// shortcut: only the official permalink plugin declares the frontmatter redirect field; other redirect producers must pass redirectField explicitly.
function redirectFieldFromConfig(
  config: ResolvedRiebeckiteConfig | undefined,
): string {
  const options = config?.plugins.find((plugin) => plugin.name === "permalink")
    ?.options as
    | { readonly redirects?: { readonly frontmatter?: unknown } }
    | undefined;
  const field = options?.redirects?.frontmatter;
  if (field === undefined) return "redirect_from";
  if (typeof field !== "string" || field.trim() === "")
    throw new Error(
      "The permalink redirects.frontmatter option must be a non-empty string.",
    );
  return field;
}

export function fingerprintContentFiles(
  files: readonly {
    readonly path: string;
    readonly content: string | Uint8Array;
  }[],
): string {
  return fingerprintFiles(files);
}

function fingerprintFiles(
  files: readonly {
    readonly path: string;
    readonly content: string | Uint8Array;
  }[],
): string {
  const hash = createHash("sha256");
  for (const file of [...files].sort((left, right) =>
    left.path.localeCompare(right.path),
  )) {
    hash.update(file.path);
    hash.update("\0");
    hash.update(createHash("sha256").update(file.content).digest("hex"));
    hash.update("\n");
  }
  return hash.digest("hex");
}

function fingerprintMutationPlan(
  operations: readonly ContentMutationOperation[],
  changes: readonly ContentMutationFileChange[],
): string {
  return createHash("sha256")
    .update(
      canonicalJson({
        operations,
        changes: changes.map((change) => ({
          path: change.path,
          beforeFingerprint: change.beforeFingerprint,
          afterFingerprint: change.afterFingerprint,
        })),
      }),
    )
    .digest("hex");
}

function fingerprintPlan(input: {
  readonly migrations: readonly {
    readonly id: string;
    readonly version: number;
    readonly fingerprint: string;
  }[];
  readonly baseContentFingerprint: string;
  readonly mutationPlanFingerprint: string;
  readonly operations: readonly ContentMutationOperation[];
  readonly diagnostics: readonly ContentMigrationDiagnostic[];
  readonly conflicts: readonly ContentMigrationDiagnostic[];
}): string {
  return createHash("sha256")
    .update(
      canonicalJson({
        migrations: input.migrations.map((migration) => ({
          id: migration.id,
          version: migration.version,
          fingerprint: migration.fingerprint,
        })),
        baseContentFingerprint: input.baseContentFingerprint,
        mutationPlanFingerprint: input.mutationPlanFingerprint,
        operations: input.operations,
        diagnostics: input.diagnostics.map((diagnostic) => ({
          severity: diagnostic.severity,
          code: diagnostic.code,
          path: diagnostic.path,
        })),
        conflicts: input.conflicts.map((conflict) => ({
          code: conflict.code,
          path: conflict.path,
        })),
      }),
    )
    .digest("hex");
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (isRecord(value)) {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort())
      sorted[key] = sortValue(value[key]);
    return sorted;
  }
  return value;
}

function findEntry(
  manifest: ContentManifest,
  contentPath: string,
): ContentManifestEntry | undefined {
  const base = contentPath.replace(/\.md$/i, "");
  return (
    manifest.bySlug.get(base) ??
    manifest.bySlug.get(`${base}/index`) ??
    manifest.bySlug.get(base.replace(/\/index$/i, ""))
  );
}

function changedFrontmatterKeys(
  file: ContentMigrationBatch["files"][number],
): Set<string> {
  const keys = new Set<string>();
  for (const key of new Set([
    ...Object.keys(file.frontmatter),
    ...Object.keys(file.originalFrontmatter),
  ])) {
    if (
      canonicalJson(file.frontmatter[key]) !==
      canonicalJson(file.originalFrontmatter[key])
    )
      keys.add(key);
  }
  return keys;
}

function diagnosticKey(diagnostic: {
  readonly code: string;
  readonly filePath?: string;
  readonly target?: string;
}): string {
  return `${diagnostic.code}\0${diagnostic.filePath ?? ""}\0${diagnostic.target ?? ""}`;
}

function mutationIssue(
  issue: {
    readonly severity: "warning" | "error";
    readonly code: string;
    readonly message: string;
    readonly path?: string;
  },
  severity: "warning" | "error",
): ContentMigrationDiagnostic {
  return {
    severity,
    code: issue.code,
    message: issue.message,
    path: issue.path,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sameMigrationPlan(
  left: ContentMigrationPlan,
  right: ContentMigrationPlan,
): boolean {
  if (
    left.baseContentFingerprint !== right.baseContentFingerprint ||
    left.mutationPlanFingerprint !== right.mutationPlanFingerprint ||
    left.planFingerprint !== right.planFingerprint ||
    canonicalJson(left.operations) !== canonicalJson(right.operations) ||
    canonicalJson(left.changes) !== canonicalJson(right.changes) ||
    left.migrations.length !== right.migrations.length
  )
    return false;
  return left.migrations.every(
    (migration, index) =>
      migration.id === right.migrations[index]?.id &&
      migration.version === right.migrations[index]?.version &&
      migration.fingerprint === right.migrations[index]?.fingerprint,
  );
}

function isAppliedRecord(
  record: ContentMigrationRecord | undefined,
  fingerprint: string,
): boolean {
  return (
    record?.status === "applied" && record.definitionFingerprint === fingerprint
  );
}

type JournalSnapshot = {
  readonly state: string;
  readonly changes: readonly {
    readonly path: string;
    readonly afterFingerprint: string | null;
  }[];
};

async function readJournalSnapshot(
  journalPath: string,
): Promise<JournalSnapshot | undefined> {
  try {
    const value = JSON.parse(await fs.readFile(journalPath, "utf8")) as unknown;
    if (
      !isRecord(value) ||
      typeof value.state !== "string" ||
      !Array.isArray(value.changes)
    )
      return undefined;
    const changes: { path: string; afterFingerprint: string | null }[] = [];
    for (const change of value.changes) {
      if (
        !isRecord(change) ||
        typeof change.path !== "string" ||
        !(
          change.afterFingerprint === null ||
          typeof change.afterFingerprint === "string"
        )
      )
        return undefined;
      changes.push({
        path: change.path,
        afterFingerprint: change.afterFingerprint as string | null,
      });
    }
    return { state: value.state, changes };
  } catch {
    return undefined;
  }
}

async function journalMatchesApplied(
  contentDirectory: string,
  journal: JournalSnapshot,
): Promise<boolean> {
  for (const change of journal.changes) {
    const target = path.resolve(contentDirectory, change.path);
    if (!isWithin(contentDirectory, target)) return false;
    let actual: string | null = null;
    try {
      actual = createHash("sha256")
        .update(await fs.readFile(target))
        .digest("hex");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") return false;
    }
    if (actual !== change.afterFingerprint) return false;
  }
  return true;
}

function isWithin(root: string, target: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

async function exists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function staleLockContent(lockPath: string): Promise<string | null> {
  let content: string;
  try {
    content = await fs.readFile(lockPath, "utf8");
  } catch {
    return null;
  }
  let value: unknown;
  try {
    value = JSON.parse(content);
  } catch {
    return (await lockFileIsOld(lockPath)) ? content : null;
  }
  const pid = isRecord(value) ? value.pid : undefined;
  if (typeof pid !== "number" || !Number.isInteger(pid) || pid <= 0)
    return (await lockFileIsOld(lockPath)) ? content : null;
  try {
    process.kill(pid, 0);
    return null;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "ESRCH" ? content : null;
  }
}

async function lockFileIsOld(lockPath: string): Promise<boolean> {
  try {
    return Date.now() - (await fs.stat(lockPath)).mtimeMs > 5_000;
  } catch {
    return false;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function sanitizeErrorMessage(
  error: unknown,
  contentDirectory: string,
): string {
  return errorMessage(error)
    .split(contentDirectory)
    .join("<content>")
    .replace(/[A-Za-z]:[\\/][^\s'"]+/gu, "<path>");
}

function errorPath(error: unknown): string | undefined {
  if (!isRecord(error) || typeof error.path !== "string") return undefined;
  const value = error.path.replace(/\\/gu, "/");
  if (value.startsWith("/") || /^[A-Za-z]:\//u.test(value)) return undefined;
  return value;
}
