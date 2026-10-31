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
import { CliUsageError } from "../cli_usage_error.js";
import { loadContentMigrationRegistry } from "./load_migrations.js";

type MigrateAction =
  | "list"
  | "plan"
  | "apply"
  | "status"
  | "history"
  | "rollback"
  | "recover";

type ParsedMigrate = {
  readonly action: MigrateAction;
  readonly json: boolean;
  readonly apply: boolean;
  readonly ids: readonly string[];
  readonly plan?: string;
  readonly out?: string;
  readonly limit?: number;
  readonly journal?: string;
  readonly target?: string;
};

const USAGE =
  "Usage: riebeckite migrate <list|plan|apply|status|history> [options] | migrate rollback <planId|migrationId> --apply | migrate recover [--journal <path>] --apply\n\n" +
  "  list [--json]\n" +
  "  plan [--id <migration>]... [--out <path>] [--json]\n" +
  "  apply [--plan <path>] [--id <migration>]... [--apply] [--json]\n" +
  "  status [--json]\n" +
  "  history [--limit <n>] [--json]\n" +
  "  rollback <planId|migrationId> --apply [--json]\n" +
  "  recover [--journal <path>] [--id <migration>] --apply [--json]";

export async function runMigrate(
  project: RiebeckiteProject,
  arguments_: readonly string[],
): Promise<boolean> {
  const command = parse(arguments_);
  const registry = await loadContentMigrationRegistry(project.projectRoot);
  const migration = createMigration(project, registry);
  if (command.action === "list") {
    const entries = await migration.list();
    print(command.json, { migrations: entries }, () =>
      entries.length === 0
        ? "No migrations."
        : entries
            .map(
              (entry) =>
                `${entry.id}@${entry.latestVersion} ${entry.status}${entry.appliedVersion ? ` (applied ${entry.appliedVersion})` : ""}`,
            )
            .join("\n"),
    );
    return true;
  }
  if (command.action === "status") {
    const report = await migration.status();
    print(command.json, report, () =>
      report.entries.length === 0
        ? "No migration state."
        : [
            ...report.entries.map(
              (entry) =>
                `${entry.id}@${entry.version} ${entry.status}${entry.definitionMatches ? "" : " (definition changed)"}`,
            ),
            `History runs: ${report.historyCount}`,
          ].join("\n"),
    );
    return true;
  }
  if (command.action === "history") {
    const history = await migration.history({ limit: command.limit });
    print(command.json, history, () =>
      history.runs.length === 0
        ? "No migration history."
        : history.runs
            .map(
              (run) =>
                `${run.at} ${run.id}@${run.version} ${run.status} (${run.changedCount} changed)`,
            )
            .join("\n"),
    );
    return true;
  }
  if (command.action === "plan") {
    const plan = await migration.plan({ ids: command.ids });
    if (command.out) {
      const output = path.resolve(project.invocationCwd, command.out);
      await migration.savePlan(plan, output);
      print(command.json, { planPath: output, plan }, () => planSummary(plan));
    } else {
      print(command.json, plan, () => planSummary(plan));
    }
    return plan.conflicts.length === 0;
  }
  if (command.action === "apply") {
    const planPath = command.plan
      ? path.resolve(project.invocationCwd, command.plan)
      : undefined;
    if (!command.apply) {
      const plan = planPath
        ? await migration.loadPlan(planPath)
        : await migration.plan({ ids: command.ids });
      print(command.json, plan, () => planSummary(plan));
      return plan.conflicts.length === 0;
    }
    const result = await migration.apply({
      planPath,
      ids: command.ids,
    });
    print(command.json, result, () => applySummary(result));
    return result.applied || result.skipped;
  }
  if (command.action === "rollback") {
    const target = command.target as string;
    if (!command.apply) {
      const status = await migration.status();
      const applied = status.entries.some(
        (entry) =>
          entry.status === "applied" &&
          (entry.planId === target || entry.id === target),
      );
      if (!applied) {
        print(command.json, {
          rolledBack: false,
          skipped: false,
          conflicts: [
            {
              severity: "error",
              code: "rollback-not-applied",
              message: "The migration has no applied state to roll back.",
            },
          ],
        });
        return false;
      }
      console.log(
        `Would roll back ${target}. Re-run with --apply to restore the mutation journal backups.`,
      );
      return true;
    }
    const result = await migration.rollback(
      (await migration.status()).entries.some(
        (entry) => entry.status === "applied" && entry.planId === target,
      )
        ? { planId: target }
        : { migrationId: target },
    );
    print(command.json, result, () => rollbackSummary(result));
    return result.rolledBack || result.skipped || result.conflicts.length === 0;
  }
  if (!command.apply) {
    const status = await migration.status();
    const candidates = status.entries.filter(
      (entry) =>
        entry.status === "applying" ||
        entry.status === "recovery-required" ||
        entry.status === "failed",
    );
    if (command.journal || command.ids.length > 0) {
      console.log(
        `Would recover ${command.journal ?? command.ids.join(", ")} from the mutation journal. Re-run with --apply.`,
      );
      return true;
    }
    if (candidates.length === 0) {
      console.log("No migration requires recovery.");
      return true;
    }
    console.log(
      `Would recover ${candidates.map((entry) => `${entry.id}@${entry.version}`).join(", ")}. Re-run with --apply.`,
    );
    return true;
  }
  const recovered = await migration.recover({
    journal: command.journal
      ? path.resolve(project.invocationCwd, command.journal)
      : undefined,
    migrationId: command.ids[0],
  });
  print(command.json, recovered, () => recoverySummary(recovered));
  return recovered.conflicts.length === 0;
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

function parse(arguments_: readonly string[]): ParsedMigrate {
  const [action, ...rest] = arguments_;
  if (
    action !== "list" &&
    action !== "plan" &&
    action !== "apply" &&
    action !== "status" &&
    action !== "history" &&
    action !== "rollback" &&
    action !== "recover"
  )
    throw new CliUsageError(USAGE);
  let json = false;
  let apply = false;
  let plan: string | undefined;
  let out: string | undefined;
  let limit: number | undefined;
  let journal: string | undefined;
  let target: string | undefined;
  const ids: string[] = [];
  for (let index = 0; index < rest.length; index += 1) {
    const option = rest[index];
    if (option === "--json") {
      if (json) throw new CliUsageError("Duplicate migrate option: --json.");
      json = true;
      continue;
    }
    if (option === "--apply") {
      if (apply) throw new CliUsageError("Duplicate migrate option: --apply.");
      apply = true;
      continue;
    }
    if (option === "--id") {
      const value = rest[index + 1];
      if (!value || value.startsWith("-"))
        throw new CliUsageError("--id requires a migration ID.");
      ids.push(value);
      index += 1;
      continue;
    }
    if (option === "--plan") {
      const value = rest[index + 1];
      if (!value || value.startsWith("-"))
        throw new CliUsageError("--plan requires a plan path.");
      if (plan !== undefined)
        throw new CliUsageError("Duplicate migrate option: --plan.");
      plan = value;
      index += 1;
      continue;
    }
    if (option === "--out") {
      const value = rest[index + 1];
      if (!value || value.startsWith("-"))
        throw new CliUsageError("--out requires a path.");
      if (out !== undefined)
        throw new CliUsageError("Duplicate migrate option: --out.");
      out = value;
      index += 1;
      continue;
    }
    if (option === "--journal") {
      const value = rest[index + 1];
      if (!value || value.startsWith("-"))
        throw new CliUsageError("--journal requires a path.");
      if (journal !== undefined)
        throw new CliUsageError("Duplicate migrate option: --journal.");
      journal = value;
      index += 1;
      continue;
    }
    if (option === "--limit") {
      const value = Number(rest[index + 1]);
      if (!Number.isInteger(value) || value < 0)
        throw new CliUsageError("--limit requires a non-negative integer.");
      if (limit !== undefined)
        throw new CliUsageError("Duplicate migrate option: --limit.");
      limit = value;
      index += 1;
      continue;
    }
    if (
      !option.startsWith("-") &&
      action === "rollback" &&
      target === undefined
    ) {
      target = option;
      continue;
    }
    throw new CliUsageError(`Unknown migrate option: ${option}.`);
  }
  if (action === "rollback" && target === undefined)
    throw new CliUsageError(
      "migrate rollback requires a plan ID or migration ID.",
    );
  if (
    apply &&
    action !== "apply" &&
    action !== "rollback" &&
    action !== "recover"
  )
    throw new CliUsageError(`--apply is not valid for migrate ${action}.`);
  if (action === "list" && (ids.length > 0 || plan || out || journal))
    throw new CliUsageError("migrate list does not accept that option.");
  if (action === "plan" && (plan || journal || limit !== undefined))
    throw new CliUsageError("migrate plan does not accept that option.");
  if (action === "apply" && (out || journal || limit !== undefined || target))
    throw new CliUsageError("migrate apply does not accept that option.");
  if (action === "status" && (ids.length > 0 || plan || out || journal))
    throw new CliUsageError("migrate status does not accept that option.");
  if (
    action === "history" &&
    (ids.length > 0 || plan || out || journal || apply)
  )
    throw new CliUsageError("migrate history does not accept that option.");
  return {
    action,
    json,
    apply,
    ids,
    plan,
    out,
    limit,
    journal,
    target,
  };
}

function print(json: boolean, value: unknown, human?: () => string): void {
  if (json) console.log(JSON.stringify(value, null, 2));
  else if (human) console.log(human());
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
