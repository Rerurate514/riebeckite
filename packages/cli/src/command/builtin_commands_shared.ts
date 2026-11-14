import type { CliCommandContext, CliCommandRegistry } from "@riebeckite/core";
import type { RiebeckiteProject } from "../application_root.js";

export async function registryFor(
  context: CliCommandContext,
): Promise<CliCommandRegistry> {
  return context.loadPluginCommands
    ? context.loadPluginCommands()
    : context.registry;
}

export async function project(
  context: CliCommandContext,
): Promise<RiebeckiteProject> {
  return context.loadProject();
}

export function validateKebabName(
  label: string,
): (value: string) => string | undefined {
  return (value) =>
    /^[a-z][a-z0-9-]{0,62}$/.test(value)
      ? undefined
      : `${label} must be kebab-case and start with a letter.`;
}

export function validatePagePath(value: string): string | undefined {
  const valid =
    /^\/[a-z0-9][a-z0-9/_-]*\/$/.test(value) &&
    !value.includes("//") &&
    !value.includes("..");
  return valid
    ? undefined
    : "PageType path must be an absolute, normalized URL path ending with '/'.";
}

export function validateIsoTimestamp(value: string): string | undefined {
  return Number.isNaN(Date.parse(value))
    ? "--at requires an ISO-8601 timestamp."
    : undefined;
}

export function validateCommaSeparated(
  allowed: readonly string[],
  label: string,
): (value: string) => string | undefined {
  return (value) => {
    const values = value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    if (values.length === 0)
      return `--features requires at least one ${label}.`;
    const unknown = values.filter((entry) => !allowed.includes(entry));
    return unknown.length === 0
      ? undefined
      : `Unknown ${label}: ${unknown.join(", ")}. Available: ${allowed.join(", ")}.`;
  };
}
