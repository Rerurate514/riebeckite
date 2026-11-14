import {
  type CliCommandDefinition,
  type CliOptionDefinition,
  cliArgument,
  cliBoolean,
  cliExample,
  cliNumber,
  cliString,
  defineCliCommand,
} from "@riebeckite/core";
import type { MigrateAction } from "../commands/migrate.js";
import { groupCommand } from "./builtin_commands_help.js";
import { project } from "./builtin_commands_shared.js";

export const MIGRATE_ACTIONS: readonly MigrateAction[] = [
  "list",
  "plan",
  "apply",
  "status",
  "history",
  "rollback",
  "recover",
];

export const MIGRATE_JSON = cliBoolean("json", {
  description: "Write machine-readable JSON to stdout.",
});

export const MIGRATE_APPLY = cliBoolean("apply", {
  description: "Write the changes instead of printing a dry run.",
});

export const MIGRATE_IDS = cliString("id", {
  description: "Limit the command to a migration ID.",
  repeatable: true,
  valueName: "id",
});

export const MIGRATE_TARGET = cliArgument("target", {
  description: "Plan ID or migration ID to roll back.",
  required: true,
});

export function migrateGroupCommand(): CliCommandDefinition {
  return groupCommand(
    "migrate",
    "Plan, apply, or roll back versioned content migrations.",
  );
}

export function migrateActionCommand(
  action: MigrateAction,
): CliCommandDefinition {
  return defineCliCommand({
    id: `migrate ${action}`,
    summary: MIGRATE_SUMMARIES[action],
    requiresProject: true,
    supportsJson: true,
    arguments: action === "rollback" ? [MIGRATE_TARGET] : [],
    options: MIGRATE_OPTIONS(action),
    examples: [cliExample(MIGRATE_EXAMPLES[action])],
    async handler(context, input) {
      const { runMigrate } = await import("../commands/migrate.js");
      const options = input.options as Readonly<Record<string, unknown>>;
      const outcome = await runMigrate(
        await project(context),
        action,
        {
          ids: Array.isArray(options.id)
            ? options.id.filter((id): id is string => typeof id === "string")
            : [],
          apply: options.apply === true,
          plan: textValue(options.plan),
          out: textValue(options.out),
          limit: typeof options.limit === "number" ? options.limit : undefined,
          journal: textValue(options.journal),
          target: textValue(input.arguments.target),
        },
        context.signal,
      );
      if (!context.json) context.output.writeLine(outcome.text);
      return { exitCode: outcome.ok ? 0 : 1, json: outcome.json };
    },
  });
}

export function MIGRATE_OPTIONS(
  action: MigrateAction,
): readonly CliOptionDefinition[] {
  if (action === "plan")
    return [
      MIGRATE_IDS,
      cliString("out", {
        description: "Write the plan to a file.",
        valueName: "path",
      }),
      MIGRATE_JSON,
    ];
  if (action === "apply")
    return [
      cliString("plan", {
        description: "Apply a saved migration plan.",
        valueName: "path",
      }),
      MIGRATE_IDS,
      MIGRATE_APPLY,
      MIGRATE_JSON,
    ];
  if (action === "history")
    return [
      cliNumber("limit", {
        description: "Maximum number of runs to list.",
        integer: true,
        min: 0,
      }),
      MIGRATE_JSON,
    ];
  if (action === "rollback") return [MIGRATE_APPLY, MIGRATE_JSON];
  if (action === "recover")
    return [
      cliString("journal", {
        description: "Recover a specific mutation journal.",
        valueName: "path",
      }),
      MIGRATE_IDS,
      MIGRATE_APPLY,
      MIGRATE_JSON,
    ];
  return [MIGRATE_JSON];
}

export const MIGRATE_SUMMARIES: Readonly<Record<MigrateAction, string>> = {
  list: "List content migrations and their applied state.",
  plan: "Plan the pending content migrations without writing.",
  apply: "Apply pending content migrations.",
  status: "Show the applied content migration state.",
  history: "Show the content migration history.",
  rollback: "Roll back an applied migration.",
  recover: "Recover an interrupted content migration.",
};

export const MIGRATE_EXAMPLES: Readonly<Record<MigrateAction, string>> = {
  list: "riebeckite migrate list",
  plan: "riebeckite migrate plan --id legacy --out migration-plan.json",
  apply: "riebeckite migrate apply --apply",
  status: "riebeckite migrate status --json",
  history: "riebeckite migrate history --limit 10",
  rollback: "riebeckite migrate rollback <planId> --apply",
  recover: "riebeckite migrate recover --apply",
};

export function textValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
