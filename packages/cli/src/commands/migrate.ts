import path from "node:path";
import type { ContentMigrationRegistry } from "@riebeckite/core";
import {
  type ContentMigrationApplyResult,
  type ContentMigrationPlan,
  type ContentMigrationRecoveryResult,
  type ContentMigrationRollbackOutcome,
  FileSystemContentMigration,
} from "@riebeckite/node";
import type { RiebeckiteProject } from "../application_root.js";
import { loadContentMigrationRegistry } from "./load_migrations.js";

export type MigrateAction =
  | "list"
  | "plan"
  | "apply"
  | "status"
  | "history"
  | "rollback"
  | "recover";

export type MigrateOptions = {
  readonly ids?: readonly string[];
  readonly apply?: boolean;
  readonly plan?: string;
  readonly out?: string;
  readonly limit?: number;
  readonly journal?: string;
  readonly target?: string;
};

export type MigrateOutcome = {
  readonly ok: boolean;
  readonly json: unknown;
  readonly text: string;
};

export async function runMigrate(
  project: RiebeckiteProject,
  action: MigrateAction,
  options: MigrateOptions = {},
  signal?: AbortSignal,
): Promise<MigrateOutcome> {
  const ids = options.ids ?? [];
  const registry = await loadContentMigrationRegistry(project.projectRoot);
  const migration = createMigration(project, registry);
  if (action === "list") {
    const entries = await migration.list();
    return {
      ok: true,
      json: { migrations: entries },
      text:
        entries.length === 0
          ? "No migrations."
          : entries
              .map(
                (entry) =>
                  `${entry.id}@${entry.latestVersion} ${entry.status}${entry.appliedVersion ? ` (applied ${entry.appliedVersion})` : ""}`,
              )
              .join("\n"),
    };
  }
  if (action === "status") {
    const report = await migration.status();
    return {
      ok: true,
      json: report,
      text:
        report.entries.length === 0
          ? "No migration state."
          : [
              ...report.entries.map(
                (entry) =>
                  `${entry.id}@${entry.version} ${entry.status}${entry.definitionMatches ? "" : " (definition changed)"}`,
              ),
              `History runs: ${report.historyCount}`,
            ].join("\n"),
    };
  }
  if (action === "history") {
    const history = await migration.history({ limit: options.limit });
    return {
      ok: true,
      json: history,
      text:
        history.runs.length === 0
          ? "No migration history."
          : history.runs
              .map(
                (run) =>
                  `${run.at} ${run.id}@${run.version} ${run.status} (${run.changedCount} changed)`,
              )
              .join("\n"),
    };
  }
  if (action === "plan") {
    const plan = await migration.plan({ ids });
    if (options.out) {
      const output = path.resolve(project.invocationCwd, options.out);
      await migration.savePlan(plan, output);
      return {
        ok: plan.conflicts.length === 0,
        json: { planPath: output, plan },
        text: planSummary(plan),
      };
    }
    return {
      ok: plan.conflicts.length === 0,
      json: plan,
      text: planSummary(plan),
    };
  }
  if (action === "apply") {
    const planPath = options.plan
      ? path.resolve(project.invocationCwd, options.plan)
      : undefined;
    if (!options.apply) {
      const plan = planPath
        ? await migration.plan({
            ids: (await migration.loadPlan(planPath)).migrations.map(
              (entry) => entry.id,
            ),
          })
        : await migration.plan({ ids });
      return {
        ok: plan.conflicts.length === 0,
        json: plan,
        text: planSummary(plan),
      };
    }
    throwIfAborted(signal);
    const result = await migration.apply({ planPath, ids });
    return {
      ok: result.applied || result.skipped,
      json: result,
      text: applySummary(result),
    };
  }
  if (action === "rollback") {
    if (!options.target)
      throw new Error("migrate rollback requires a plan ID or migration ID.");
    const target = options.target;
    if (!options.apply) {
      const status = await migration.status();
      const applied = status.entries.some(
        (entry) =>
          entry.status === "applied" &&
          (entry.planId === target || entry.id === target),
      );
      if (!applied)
        return {
          ok: false,
          json: {
            rolledBack: false,
            skipped: false,
            conflicts: [
              {
                severity: "error",
                code: "rollback-not-applied",
                message: "The migration has no applied state to roll back.",
              },
            ],
          },
          text: "The migration has no applied state to roll back.",
        };
      return {
        ok: true,
        json: { rolledBack: false, skipped: false, target },
        text: `Would roll back ${target}. Re-run with --apply to restore the mutation journal backups.`,
      };
    }
    throwIfAborted(signal);
    const status = await migration.status();
    const result = await migration.rollback(
      status.entries.some(
        (entry) => entry.status === "applied" && entry.planId === target,
      )
        ? { planId: target }
        : { migrationId: target },
    );
    return {
      ok: result.rolledBack || result.skipped || result.conflicts.length === 0,
      json: result,
      text: rollbackSummary(result),
    };
  }
  if (!options.apply) {
    const status = await migration.status();
    const candidates = status.entries.filter(
      (entry) =>
        entry.status === "applying" ||
        entry.status === "recovery-required" ||
        entry.status === "failed",
    );
    if (options.journal || ids.length > 0)
      return {
        ok: true,
        json: { recovered: false, skipped: true },
        text: `Would recover ${options.journal ?? ids.join(", ")} from the mutation journal. Re-run with --apply.`,
      };
    if (candidates.length === 0)
      return {
        ok: true,
        json: { recovered: false, skipped: true },
        text: "No migration requires recovery.",
      };
    return {
      ok: true,
      json: { recovered: false, skipped: true, candidates },
      text: `Would recover ${candidates.map((entry) => `${entry.id}@${entry.version}`).join(", ")}. Re-run with --apply.`,
    };
  }
  throwIfAborted(signal);
  const recovered = await migration.recover({
    journal: options.journal
      ? path.resolve(project.invocationCwd, options.journal)
      : undefined,
    migrationId: ids[0],
  });
  return {
    ok: recovered.conflicts.length === 0,
    json: recovered,
    text: recoverySummary(recovered),
  };
}

function createMigration(
  project: RiebeckiteProject,
  registry: ContentMigrationRegistry,
): FileSystemContentMigration {
  return new FileSystemContentMigration({
    contentDirectory: project.contentRoot,
    registry,
    config: project.config,
    plugins: project.config?.plugins,
    buildTime: new Date(),
  });
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw new Error("The migration was aborted.");
}

function planSummary(plan: ContentMigrationPlan): string {
  const lines = [
    `Migration plan ${plan.id}`,
    `Migrations: ${plan.migrations.map((migration) => `${migration.id}@${migration.version}`).join(", ") || "none"}`,
    `Changed files: ${plan.changes.length}`,
    `Created: ${plan.impact.created}, moved: ${plan.impact.moved}, frontmatter: ${plan.impact.frontmatter}`,
  ];
  for (const diagnostic of plan.diagnostics)
    lines.push(
      `${diagnostic.severity}: ${diagnostic.code}: ${diagnostic.message}`,
    );
  for (const conflict of plan.conflicts)
    lines.push(`Conflict: ${conflict.code}: ${conflict.message}`);
  return lines.join("\n");
}

function applySummary(result: ContentMigrationApplyResult): string {
  if (result.skipped)
    return "No pending migration was applied; the plan is already applied.";
  if (!result.applied)
    return [
      "The migration was not applied.",
      ...result.conflicts.map(
        (conflict) => `Conflict: ${conflict.code}: ${conflict.message}`,
      ),
    ].join("\n");
  return `Applied ${result.changedPaths.length} file change(s)${
    result.journalPath ? `; mutation journal ${result.journalPath}` : ""
  }.`;
}

function rollbackSummary(result: ContentMigrationRollbackOutcome): string {
  if (result.skipped) return "The migration was already rolled back.";
  if (!result.rolledBack)
    return [
      "The migration could not be rolled back.",
      ...result.conflicts.map(
        (conflict) => `Conflict: ${conflict.code}: ${conflict.message}`,
      ),
    ].join("\n");
  return `Rolled back ${result.restoredPaths.length} file change(s).`;
}

function recoverySummary(result: ContentMigrationRecoveryResult): string {
  if (result.skipped) return "No migration requires recovery.";
  if (result.conflicts.length > 0)
    return [
      "The migration could not be recovered.",
      ...result.conflicts.map(
        (conflict) => `Conflict: ${conflict.code}: ${conflict.message}`,
      ),
    ].join("\n");
  if (result.recovered)
    return `Recovered the mutation journal and restored ${result.restoredPaths.length} file change(s).`;
  if (result.applied) return "Reconciled a completed mutation journal.";
  return "The migration journal was already settled.";
}
