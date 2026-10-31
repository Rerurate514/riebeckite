import { FileSystemContentMutation } from "@riebeckite/node";
import type { RiebeckiteProject } from "../application_root.js";
import { CliUsageError } from "../cli_usage_error.js";

const USAGE =
  "Usage: riebeckite content <create <path> [--body <text>] | edit <path> --body <text> | delete <path> | move <from> <to> | recover <journal>> [--apply] [--json]";

export async function runContentMutation(
  project: RiebeckiteProject,
  arguments_: readonly string[],
): Promise<boolean> {
  const { action, values, apply, json } = parse(arguments_);
  const first = values[0];
  if (first === undefined) throw new CliUsageError(USAGE);
  const mutation = new FileSystemContentMutation(project.contentRoot);
  if (action === "recover") {
    if (!apply) throw new CliUsageError("content recover requires --apply.");
    const result = await mutation.recover(first);
    print(json, result);
    return result.recovered || result.conflicts.length === 0;
  }
  const operation =
    action === "create"
      ? { kind: "create" as const, path: first, content: values[1] ?? "" }
      : action === "edit"
        ? { kind: "update" as const, path: first, content: secondValue(values) }
        : action === "delete"
          ? { kind: "delete" as const, path: first }
          : { kind: "move" as const, from: first, to: secondValue(values) };
  const plan = await mutation.plan([operation]);
  if (plan.conflicts.length > 0) {
    print(json, plan);
    return false;
  }
  if (!apply) {
    print(json, plan);
    return true;
  }
  const result = await mutation.apply(plan);
  print(json, result);
  return result.applied;
}

function parse(arguments_: readonly string[]): {
  action: "create" | "edit" | "delete" | "move" | "recover";
  values: string[];
  apply: boolean;
  json: boolean;
} {
  const [action, ...rest] = arguments_;
  if (
    action !== "create" &&
    action !== "edit" &&
    action !== "delete" &&
    action !== "move" &&
    action !== "recover"
  )
    throw new CliUsageError(USAGE);
  let apply = false;
  let json = false;
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
    if (value === "--body") {
      const body = rest[index + 1];
      if (body === undefined) throw new CliUsageError("--body requires text.");
      values.push(body);
      index += 1;
      continue;
    }
    if (value?.startsWith("-"))
      throw new CliUsageError(`Unknown content option: ${value}`);
    if (value !== undefined) values.push(value);
  }
  const count =
    action === "create" || action === "edit" || action === "recover"
      ? action === "edit"
        ? 2
        : 1
      : action === "delete"
        ? 1
        : 2;
  if (values.length !== count) throw new CliUsageError(USAGE);
  return { action, values, apply, json };
}

function secondValue(values: readonly string[]): string {
  const value = values[1];
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
    };
    console.log(`Plan ${plan.id}`);
    for (const change of plan.changes)
      console.log(
        `  ${change.beforeFingerprint === null ? "create" : change.afterFingerprint === null ? "delete" : "update"} ${change.path}`,
      );
    for (const warning of plan.warnings)
      console.log(`Warning: ${warning.message}`);
    console.log("Dry run. Re-run with --apply to write changes.");
    return;
  }
  console.log(JSON.stringify(value, null, 2));
}
