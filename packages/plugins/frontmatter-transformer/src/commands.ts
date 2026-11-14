import path from "node:path";
import {
  type CliCommandDefinition,
  type CliCommandInput,
  CliUsageError,
  cliExample,
  defineCliCommand,
} from "@riebeckite/core";
import type {
  ContentMigrationApplyResult,
  ContentMigrationPlan,
  ContentMigrationRollbackOutcome,
} from "@riebeckite/node";
import {
  APPLY_OPTION,
  createMigration,
  JSON_OPTION,
  LIMIT_OPTION,
  OUT_OPTION,
  PLAN_OPTION,
  PRESET_OPTION,
  readPresetsInput,
  TARGET_ARGUMENT,
} from "./commands_helpers.js";
import { FRONTMATTER_PRESETS } from "./presets.js";

export function createFrontmatterCommands(): readonly CliCommandDefinition[] {
  return [
    presetsCommand(),
    planCommand(),
    applyCommand(),
    historyCommand(),
    rollbackCommand(),
  ];
}

function presetsCommand(): CliCommandDefinition {
  return defineCliCommand({
    id: "presets",
    summary: "List frontmatter transformation presets.",
    requiresProject: true,
    supportsJson: true,
    options: [JSON_OPTION],
    async handler(context) {
      const presets = FRONTMATTER_PRESETS.map(({ id, description }) => ({
        id,
        description,
      }));
      if (!context.json) {
        for (const preset of presets) {
          context.output.writeLine(`${preset.id}  ${preset.description}`);
        }
      }
      return { json: { presets } };
    },
  });
}

function planCommand(): CliCommandDefinition {
  return defineCliCommand({
    id: "plan",
    summary: "Plan a frontmatter transformation.",
    requiresProject: true,
    supportsJson: true,
    options: [PRESET_OPTION, OUT_OPTION, JSON_OPTION],
    validate: requirePreset,
    examples: [
      cliExample("riebeckite frontmatter plan --preset normalize-tags"),
    ],
    async handler(context, input) {
      const project = await context.loadProject();
      const presetIds = readPresets(input);
      const migration = await createMigration(project, presetIds);
      const plan = await migration.plan({ ids: presetIds });
      let planPath: string | undefined;
      const out = readString(input, "out");
      if (out) {
        planPath = path.resolve(project.invocationCwd, out);
        await migration.savePlan(plan, planPath);
      }
      if (!context.json) context.output.writeLine(planSummary(plan));
      return {
        exitCode: planSucceeded(plan) ? 0 : 1,
        json: planPath ? { planPath, plan } : plan,
      };
    },
  });
}

function applyCommand(): CliCommandDefinition {
  return defineCliCommand({
    id: "apply",
    summary: "Apply a frontmatter transformation.",
    description:
      "Prints a dry run unless --apply is passed. This reuses the Content Migration plan, mutation journal, and rollback state.",
    requiresProject: true,
    supportsJson: true,
    options: [PRESET_OPTION, PLAN_OPTION, APPLY_OPTION, JSON_OPTION],
    validate(input) {
      if (!readPresetsInput(input).length && !readString(input, "plan")) {
        return "Pass at least one --preset or a --plan.";
      }
      if (readPresetsInput(input).length && readString(input, "plan")) {
        return "Use either --preset or --plan, not both.";
      }
      return undefined;
    },
    examples: [
      cliExample("riebeckite frontmatter apply --preset trim-text"),
      cliExample("riebeckite frontmatter apply --preset trim-text --apply"),
    ],
    async handler(context, input) {
      const project = await context.loadProject();
      const presetIds = readPresets(input);
      const planInput = readString(input, "plan");
      const planPath = planInput
        ? path.resolve(project.invocationCwd, planInput)
        : undefined;
      const migration = await createMigration(
        project,
        presetIds.length ? presetIds : undefined,
      );
      if (!readBoolean(input, "apply")) {
        const plan = planPath
          ? await migration.plan({
              ids: (await migration.loadPlan(planPath)).migrations.map(
                (entry) => entry.id,
              ),
            })
          : await migration.plan({ ids: presetIds });
        if (!context.json) context.output.writeLine(planSummary(plan));
        return { exitCode: planSucceeded(plan) ? 0 : 1, json: plan };
      }
      throwIfAborted(context.signal);
      const result = await migration.apply({ planPath, ids: presetIds });
      if (!context.json) context.output.writeLine(applySummary(result));
      return {
        exitCode: result.applied || result.skipped ? 0 : 1,
        json: result,
      };
    },
  });
}

function historyCommand(): CliCommandDefinition {
  return defineCliCommand({
    id: "history",
    summary: "Show frontmatter transformation history.",
    requiresProject: true,
    supportsJson: true,
    options: [LIMIT_OPTION, JSON_OPTION],
    async handler(context, input) {
      const migration = await createMigration(await context.loadProject());
      const limit = input.options.limit;
      const history = await migration.history({ limit });
      if (!context.json) {
        if (history.runs.length === 0) context.output.writeLine("No history.");
        for (const run of history.runs) {
          context.output.writeLine(
            `${run.at} ${run.id}@${run.version} ${run.status} (${run.changedCount} changed)`,
          );
        }
      }
      return { json: history };
    },
  });
}

function rollbackCommand(): CliCommandDefinition {
  return defineCliCommand({
    id: "rollback",
    summary: "Roll back an applied frontmatter transformation.",
    requiresProject: true,
    supportsJson: true,
    arguments: [TARGET_ARGUMENT],
    options: [APPLY_OPTION, JSON_OPTION],
    examples: [cliExample("riebeckite frontmatter rollback <plan-id> --apply")],
    async handler(context, input) {
      const migration = await createMigration(await context.loadProject());
      const target = input.arguments.target;
      if (!readBoolean(input, "apply")) {
        const status = await migration.status();
        const applied = status.entries.some(
          (entry) =>
            entry.status === "applied" &&
            (entry.planId === target || entry.id === target),
        );
        const json = { rolledBack: false, skipped: false, target };
        if (!context.json) {
          context.output.writeLine(
            applied
              ? `Would roll back ${target}. Re-run with --apply.`
              : "The migration has no applied state to roll back.",
          );
        }
        return { exitCode: applied ? 0 : 1, json };
      }
      throwIfAborted(context.signal);
      const status = await migration.status();
      const result = await migration.rollback(
        status.entries.some(
          (entry) => entry.status === "applied" && entry.planId === target,
        )
          ? { planId: target }
          : { migrationId: target },
      );
      if (!context.json) context.output.writeLine(rollbackSummary(result));
      return {
        exitCode: result.rolledBack || result.skipped ? 0 : 1,
        json: result,
      };
    },
  });
}

function requirePreset(input: CliCommandInput): string | undefined {
  return readPresetsInput(input).length === 0
    ? "Pass at least one --preset."
    : undefined;
}

function readPresets(input: CliCommandInput): readonly string[] {
  const ids = readPresetsInput(input);
  if (ids.length === 0) {
    throw new CliUsageError(
      `Pass at least one --preset. Available presets: ${FRONTMATTER_PRESETS.map((preset) => preset.id).join(", ")}.`,
    );
  }
  return ids;
}

function readBoolean(input: CliCommandInput, name: string): boolean {
  return input.options[name] === true;
}

function readString(input: CliCommandInput, name: string): string | undefined {
  const value = input.options[name];
  return typeof value === "string" ? value : undefined;
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted)
    throw new Error("The frontmatter transformation was aborted.");
}

function planSucceeded(plan: ContentMigrationPlan): boolean {
  return (
    plan.conflicts.length === 0 &&
    !plan.diagnostics.some((diagnostic) => diagnostic.severity === "error")
  );
}

function planSummary(plan: ContentMigrationPlan): string {
  const lines = [
    `Migration plan ${plan.id}`,
    `Presets: ${plan.migrations.map((migration) => `${migration.id}@${migration.version}`).join(", ") || "none"}`,
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
    return "No pending transformation was applied; the plan is already applied.";
  if (!result.applied)
    return [
      "The transformation was not applied.",
      ...result.conflicts.map(
        (conflict) => `Conflict: ${conflict.code}: ${conflict.message}`,
      ),
    ].join("\n");
  return `Applied ${result.changedPaths.length} file change(s)${
    result.journalPath ? `; mutation journal ${result.journalPath}` : ""
  }.`;
}

function rollbackSummary(result: ContentMigrationRollbackOutcome): string {
  if (result.skipped) return "The transformation was already rolled back.";
  if (!result.rolledBack)
    return [
      "The transformation could not be rolled back.",
      ...result.conflicts.map(
        (conflict) => `Conflict: ${conflict.code}: ${conflict.message}`,
      ),
    ].join("\n");
  return `Rolled back ${result.restoredPaths.length} file change(s).`;
}
