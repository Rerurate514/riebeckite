import path from "node:path";
import {
  type CliCommandContext,
  type CliCommandDefinition,
  type CliCommandInput,
  CliUsageError,
  cliArgument,
  cliBoolean,
  cliExample,
  cliNumber,
  cliString,
  defineCliCommand,
} from "@riebeckite/core";
import type {
  ContentMigrationApplyResult,
  ContentMigrationPlan,
  ContentMigrationRollbackOutcome,
} from "@riebeckite/node";
import { FRONTMATTER_PRESETS, frontmatterPresetRegistry } from "./presets.js";

const JSON_OPTION = cliBoolean("json", {
  description: "Write machine-readable JSON to stdout.",
});
const APPLY_OPTION = cliBoolean("apply", {
  description: "Write the changes instead of printing a dry run.",
});
const PRESET_OPTION = cliString("preset", {
  description: "Frontmatter preset to run.",
  valueName: "name",
  repeatable: true,
});
const PLAN_OPTION = cliString("plan", {
  description: "Use a previously saved migration plan.",
  valueName: "path",
});
const OUT_OPTION = cliString("out", {
  description: "Write the plan to a file.",
  valueName: "path",
});
const LIMIT_OPTION = cliNumber("limit", {
  description: "Maximum number of history runs.",
  integer: true,
  min: 0,
});
const TARGET_ARGUMENT = cliArgument("target", {
  description: "Plan ID or migration ID to roll back.",
  required: true,
});

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
      if (readString(input, "out")) {
        planPath = path.resolve(
          project.invocationCwd,
          readString(input, "out"),
        );
        await migration.savePlan(plan, planPath);
      }
      if (!context.json) context.output.writeLine(planSummary(plan));
      return {
        exitCode: plan.conflicts.length === 0 ? 0 : 1,
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
      return undefined;
    },
    examples: [
      cliExample("riebeckite frontmatter apply --preset trim-text"),
      cliExample("riebeckite frontmatter apply --preset trim-text --apply"),
    ],
    async handler(context, input) {
      const project = await context.loadProject();
      const presetIds = readPresets(input);
      const planPath = readString(input, "plan")
        ? path.resolve(project.invocationCwd, readString(input, "plan"))
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
        return { exitCode: plan.conflicts.length === 0 ? 0 : 1, json: plan };
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

async function createMigration(
  project: Awaited<ReturnType<CliCommandContext["loadProject"]>>,
  presetIds?: readonly string[],
) {
  const { FileSystemContentMigration } = await import("@riebeckite/node");
  return new FileSystemContentMigration({
    contentDirectory: project.contentRoot,
    registry: frontmatterPresetRegistry(presetIds),
    config: project.config,
    plugins: project.config?.plugins,
    buildTime: new Date(),
  });
}

function requirePreset(input: CliCommandInput): string | undefined {
  return readPresetsInput(input).length === 0
    ? "Pass at least one --preset."
    : undefined;
}

function readPresetsInput(input: CliCommandInput): readonly string[] {
  const value = input.options.preset;
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
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
