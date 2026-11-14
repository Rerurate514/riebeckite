import type {
  CliArgumentDefinition,
  CliCommandDefinition,
  CliCommandNode,
  CliCommandRegistry,
  CliOptionDefinition,
} from "./types.js";

export function findNode(
  registry: CliCommandRegistry,
  path: string,
): CliCommandNode | undefined {
  const segments = path.split(" ");
  let level = registry.nodes;
  let node: CliCommandNode | undefined;
  for (const segment of segments) {
    node = level.find((entry) => entry.name === segment);
    if (!node) return undefined;
    level = node.children;
  }
  return node;
}

export function usageFor(
  registry: CliCommandRegistry,
  command: CliCommandDefinition,
): string {
  const parts = ["riebeckite", command.id];
  for (const argument of command.arguments ?? []) {
    if (argument.variadic) {
      parts.push(`[${argument.name}...]`);
    } else if (argument.required) {
      parts.push(`<${argument.name}>`);
    } else {
      parts.push(`[${argument.name}]`);
    }
  }
  const node = findNode(registry, command.id);
  if (node && node.children.length > 0) parts.push("<command>");
  if (command.raw) parts.push("[args...]");
  else if (
    (command.options ?? []).length > 0 ||
    (command.supportsJson === true && !hasJsonOption(command))
  )
    parts.push("[options]");
  return parts.join(" ");
}

export function hasJsonOption(command: CliCommandDefinition): boolean {
  return (command.options ?? []).some((option) => option.name === "json");
}

export function formatArgumentUsage(argument: CliArgumentDefinition): string {
  const body = argument.variadic
    ? `<${argument.name}...>`
    : argument.required
      ? `<${argument.name}>`
      : `[${argument.name}]`;
  return body;
}

export function argumentHelp(argument: CliArgumentDefinition): string {
  const details: string[] = [];
  if (argument.description) details.push(argument.description);
  if (argument.values) details.push(`one of: ${argument.values.join(", ")}`);
  if (argument.default !== undefined)
    details.push(`default: ${argument.default}`);
  if (argument.required) details.push("required");
  return details.join(" ");
}

export function formatOptionUsage(option: CliOptionDefinition): string {
  const names: string[] = [];
  if (option.short) names.push(`-${option.short}`);
  names.push(`--${option.name}`);
  let usage = names.join(", ");
  if (option.negatable) usage += ` / --no-${option.name}`;
  if (option.type !== "boolean") {
    usage += ` <${
      option.type === "enum"
        ? (option.values ?? []).join("|")
        : (option.valueName ?? (option.type === "number" ? "number" : "value"))
    }>`;
    if (option.repeatable) usage += "...";
  }
  return usage;
}

export function optionHelp(option: CliOptionDefinition): string {
  const details: string[] = [];
  if (option.description) details.push(option.description);
  if (option.required) details.push("required");
  if (option.default !== undefined)
    details.push(`default: ${String(option.default)}`);
  return details.join(" ");
}

export function pad(value: string, width: number): string {
  if (value.length >= width) return `${value} `;
  return value.padEnd(width);
}

export function wrapText(text: string, width: number): string[] {
  if (!text) return [""];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (line.length === 0) {
      line = word;
    } else if (line.length + 1 + word.length <= width) {
      line += ` ${word}`;
    } else {
      lines.push(line);
      line = word;
    }
  }
  lines.push(line);
  return lines;
}
