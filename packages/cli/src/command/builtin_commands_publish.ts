import {
  type CliCommandDefinition,
  type CliCommandInput,
  type CliOptionDefinition,
  cliBoolean,
  cliEnum,
  cliString,
  cliVariadicArgument,
  defineCliCommand,
} from "@riebeckite/core";
import type {
  PublishAction,
  PublishCommandOptions,
} from "../commands/publish.js";
import { groupCommand } from "./builtin_commands_help.js";
import { project, validateIsoTimestamp } from "./builtin_commands_shared.js";

export const PUBLISH_PROVIDERS = [
  "github-pages",
  "cloudflare-workers",
  "cloudflare-pages",
  "netlify",
  "vercel",
] as const;

export const PUBLISH_ACTIONS = [
  "plan",
  "status",
  "validate",
  "run",
  "approve",
  "revoke",
  "record",
  "gate",
] as const;

export const PUBLISH_JSON = cliBoolean("json", {
  description: "Print the result as JSON.",
  short: "j",
});

export const PUBLISH_AT = cliString("at", {
  description: "Use the project state at an ISO-8601 timestamp.",
  valueName: "timestamp",
  validate: validateIsoTimestamp,
});

export const PUBLISH_PROVIDER = cliEnum("provider", PUBLISH_PROVIDERS, {
  description: "Publication provider to inspect or record.",
  valueName: "provider",
});

export const PUBLISH_APPROVALS = cliString("approvals", {
  description: "Approval file path.",
  valueName: "path",
});

export const PUBLISH_REQUIRE_APPROVAL = cliBoolean("require-approval", {
  description: "Record the workflow as approved before running.",
});

export const PUBLISH_STATE_FILE = cliString("state-file", {
  description: "Durable publication state path.",
  valueName: "path",
});

export const PUBLISH_TRIGGER = cliEnum(
  "trigger",
  ["manual", "scheduled", "ci", "cli"],
  {
    description: "Publication trigger.",
    default: "cli",
  },
);

export const PUBLISH_SLUGS = cliVariadicArgument("slug", {
  description: "Publication slugs.",
});

export function publishGroupCommand(): CliCommandDefinition {
  return groupCommand(
    "publish",
    "Plan, validate, approve, or publish a build.",
  );
}

export function publishActionCommand(
  action: PublishAction,
): CliCommandDefinition {
  const common = [
    PUBLISH_JSON,
    PUBLISH_AT,
    PUBLISH_PROVIDER,
    PUBLISH_APPROVALS,
    PUBLISH_REQUIRE_APPROVAL,
    PUBLISH_STATE_FILE,
  ];
  const options: readonly CliOptionDefinition[] =
    action === "run"
      ? [
          PUBLISH_JSON,
          PUBLISH_PROVIDER,
          PUBLISH_APPROVALS,
          PUBLISH_REQUIRE_APPROVAL,
          PUBLISH_STATE_FILE,
          cliBoolean("execute", { description: "Execute the publication." }),
          cliBoolean("force", { description: "Force the publication." }),
          PUBLISH_TRIGGER,
        ]
      : action === "record"
        ? [...common, PUBLISH_TRIGGER]
        : action === "approve" || action === "revoke"
          ? [
              PUBLISH_JSON,
              PUBLISH_AT,
              PUBLISH_APPROVALS,
              PUBLISH_REQUIRE_APPROVAL,
              cliBoolean("all", {
                description: `Apply to all pending ${action === "approve" ? "publications" : "approvals"}.`,
              }),
              cliString("by", {
                description: "Approver name.",
                valueName: "name",
              }),
            ]
          : common;
  return defineCliCommand({
    id: `publish ${action}`,
    summary: publishSummary(action),
    requiresProject: true,
    supportsJson: true,
    arguments:
      action === "approve" || action === "revoke" ? [PUBLISH_SLUGS] : [],
    options,
    validate(input) {
      if (action !== "approve" && action !== "revoke") return undefined;
      return (input.arguments.slug as readonly string[]).length === 0 &&
        input.options.all !== true
        ? `publish ${action} requires at least one slug or --all.`
        : undefined;
    },
    async handler(context, input) {
      const { runPublish } = await import("../commands/publish.js");
      return runPublish(await project(context), publishOptions(action, input));
    },
  });
}

export function publishOptions(
  action: PublishAction,
  input: CliCommandInput,
): PublishCommandOptions {
  const json = input.options.json === true;
  const at = input.options.at as string | undefined;
  const provider = input.options.provider as PublishCommandOptions["provider"];
  const approvals = input.options.approvals as string | undefined;
  const stateFile = input.options.stateFile as string | undefined;
  const requireApproval = input.options.requireApproval === true;
  return {
    action,
    json,
    ...(at === undefined ? {} : { at }),
    ...(provider === undefined ? {} : { provider }),
    ...(approvals === undefined ? {} : { approvals }),
    ...(stateFile === undefined ? {} : { stateFile }),
    ...(requireApproval ? { workflow: "approved" as const } : {}),
    execute: input.options.execute === true,
    force: input.options.force === true,
    trigger:
      (input.options.trigger as
        | "manual"
        | "scheduled"
        | "ci"
        | "cli"
        | undefined) ?? "cli",
    slugs: (input.arguments.slug as readonly string[] | undefined) ?? [],
    all: input.options.all === true,
    ...(typeof input.options.by === "string"
      ? { approvedBy: input.options.by }
      : {}),
  };
}

export function publishSummary(action: PublishAction): string {
  switch (action) {
    case "plan":
      return "Show the publication plan.";
    case "status":
      return "Show publication status.";
    case "validate":
      return "Validate publication readiness.";
    case "run":
      return "Run a publication.";
    case "approve":
      return "Approve publication gates.";
    case "revoke":
      return "Revoke publication approvals.";
    case "record":
      return "Record publication metadata.";
    case "gate":
      return "Show or evaluate a publication gate.";
  }
}
