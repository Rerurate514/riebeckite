import { CliUsageError, type ContentMutationOperation } from "@riebeckite/core";
import { FileSystemContentMutation } from "@riebeckite/node";
import type { RiebeckiteProject } from "../application_root.js";

const USAGE =
  "Usage: riebeckite content <create|edit|delete|move> ... [--apply] [--json] | content plan <create|edit|delete|move> ... [--out <name>] [--json] | content apply <plan> --apply [--json] | content recover <journal> --apply [--json]";

type ContentAction = "create" | "edit" | "delete" | "move";

type ParsedCommand = {
  readonly action: ContentAction | "apply" | "recover";
  readonly values: readonly string[];
  readonly apply: boolean;
  readonly json: boolean;
  readonly save: boolean;
  readonly output?: string;
};

export async function runContentMutation(
  project: RiebeckiteProject,
  arguments_: readonly string[],
): Promise<boolean> {
  const command = parse(arguments_);
  const mutation = new FileSystemContentMutation(project.contentRoot);
  if (command.action === "apply") {
    if (!command.apply)
      throw new CliUsageError("content apply requires --apply.");
    const result = await mutation.apply(
      await mutation.loadPlan(valueAt(command.values, 0)),
    );
    print(command.json, result);
    return result.applied;
  }
  if (command.action === "recover") {
    if (!command.apply)
      throw new CliUsageError("content recover requires --apply.");
    const result = await mutation.recover(valueAt(command.values, 0));
    print(command.json, result);
    return result.recovered || result.conflicts.length === 0;
  }
  const plan = await mutation.plan([operationFor(command)]);
  if (command.save) {
    const planPath = await mutation.savePlan(plan, command.output);
    print(command.json, { planPath, plan });
    return plan.conflicts.length === 0;
  }
  if (plan.conflicts.length > 0) {
    print(command.json, plan);
    return false;
  }
  if (!command.apply) {
    print(command.json, plan);
    return true;
  }
  const result = await mutation.apply(plan);
  print(command.json, result);
  return result.applied;
}

function parse(arguments_: readonly string[]): ParsedCommand {
  const [first, ...rest] = arguments_;
  const save = first === "plan";
  const action = save ? rest.shift() : first;
  if (!isAction(action) && action !== "apply" && action !== "recover")
    throw new CliUsageError(USAGE);
  let apply = false;
  let json = false;
  let output: string | undefined;
  const values: string[] = [];
  for (let index = 0; index < rest.length; index += 1) {
    const value = rest[index];
    if (value === "--apply") {
      if (apply) throw new CliUsageError("Duplicate content option: --apply.");
      apply = true;
      continue;
    }
    if (value === "--json") {
      if (json) throw new CliUsageError("Duplicate content option: --json.");
      json = true;
      continue;
    }
    if (value === "--out") {
      if (!save || output !== undefined || rest[index + 1] === undefined)
        throw new CliUsageError(
          "--out is only available for content plan and requires a path.",
        );
      output = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--body") {
      if (rest[index + 1] === undefined)
        throw new CliUsageError("--body requires text.");
      values.push(rest[index + 1]);
      index += 1;
      continue;
    }
    if (value?.startsWith("-"))
      throw new CliUsageError(`Unknown content option: ${value}`);
    if (value !== undefined) values.push(value);
  }
  const validValues =
    action === "create"
      ? values.length === 1 || values.length === 2
      : action === "edit" || action === "move"
        ? values.length === 2
        : values.length === 1;
  if (!validValues || (save && apply)) throw new CliUsageError(USAGE);
  return { action, values, apply, json, save, output };
}

function isAction(value: string | undefined): value is ContentAction {
  return (
    value === "create" ||
    value === "edit" ||
    value === "delete" ||
    value === "move"
  );
}

function operationFor(command: ParsedCommand): ContentMutationOperation {
  if (command.action === "create")
    return {
      kind: "create",
      path: valueAt(command.values, 0),
      content: command.values[1] ?? "",
    };
  if (command.action === "edit")
    return {
      kind: "update",
      path: valueAt(command.values, 0),
      content: command.values[1] ?? "",
    };
  if (command.action === "delete")
    return { kind: "delete", path: valueAt(command.values, 0) };
  if (command.action === "move")
    return {
      kind: "move",
      from: valueAt(command.values, 0),
      to: valueAt(command.values, 1),
    };
  throw new CliUsageError(USAGE);
}

function valueAt(values: readonly string[], index: number): string {
  const value = values[index];
  if (value === undefined) throw new CliUsageError(USAGE);
  return value;
}

function print(json: boolean, value: unknown): void {
  if (json) {
    console.log(JSON.stringify(value, null, 2));
    return;
  }
  if ("changes" in (value as object)) {
    const plan = value as {
      id: string;
      changes: readonly {
        path: string;
        beforeFingerprint: string | null;
        afterFingerprint: string | null;
      }[];
      warnings: readonly { message: string }[];
      conflicts: readonly { path: string; message: string }[];
    };
    console.log(`Plan ${plan.id}`);
    for (const change of plan.changes)
      console.log(
        `  ${change.beforeFingerprint === null ? "create" : change.afterFingerprint === null ? "delete" : "update"} ${change.path}`,
      );
    for (const warning of plan.warnings)
      console.log(`Warning: ${warning.message}`);
    for (const conflict of plan.conflicts)
      console.log(`Conflict: ${conflict.path}: ${conflict.message}`);
    console.log(
      plan.conflicts.length > 0
        ? "The plan cannot be applied."
        : "Dry run. Re-run with --apply to write changes.",
    );
    return;
  }
  console.log(JSON.stringify(value, null, 2));
}
