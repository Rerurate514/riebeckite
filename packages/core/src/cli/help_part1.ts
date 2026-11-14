import { CliUsageError } from "./errors.js";
import {
  argumentHelp,
  findNode,
  formatArgumentUsage,
  formatOptionUsage,
  hasJsonOption,
  optionHelp,
  pad,
  usageFor,
  wrapText,
} from "./help_part2.js";
import { suggest } from "./parse.js";
import type {
  CliCommandDefinition,
  CliCommandNode,
  CliCommandRegistry,
} from "./types.js";

export type HelpOptions = {
  readonly width?: number;
  readonly color?: boolean;
  readonly version?: string;
};

export function formatRootHelp(
  registry: CliCommandRegistry,
  options: HelpOptions = {},
): string {
  const width = options.width ?? 80;
  const lines: string[] = [];
  if (options.version) {
    lines.push(`Riebeckite CLI ${options.version}`, "");
  }
  lines.push("Usage: riebeckite <command> [options]", "");
  lines.push("Commands:");
  lines.push(...formatNodes(registry.nodes, "", width, options.color === true));
  lines.push("");
  lines.push("Options:");
  lines.push("  -h, --help     Show help.");
  lines.push("  -v, --version  Show the CLI version.");
  lines.push("");
  lines.push("Run 'riebeckite help <command>' for details.");
  return lines.join("\n");
}

export function formatCommandHelp(
  registry: CliCommandRegistry,
  command: CliCommandDefinition,
  options: HelpOptions = {},
): string {
  const lines: string[] = [];
  lines.push(`Usage: ${usageFor(registry, command)}`);
  lines.push("");
  lines.push(command.description ?? command.summary);

  const node = findNode(registry, command.id);
  if (node && node.children.length > 0) {
    lines.push("");
    lines.push("Commands:");
    lines.push(
      ...formatNodes(
        node.children,
        "  ",
        options.width ?? 80,
        options.color === true,
      ),
    );
  }

  const arguments_ = (command.arguments ?? []).filter(
    (argument) => !argument.hidden,
  );
  if (arguments_.length > 0) {
    lines.push("");
    lines.push("Arguments:");
    for (const argument of arguments_) {
      lines.push(
        `  ${pad(formatArgumentUsage(argument), 24)}${wrapText(
          argumentHelp(argument),
          Math.max(20, (options.width ?? 80) - 26),
        ).join(`\n${" ".repeat(26)}`)}`,
      );
    }
  }

  const options_ = (command.options ?? []).filter((option) => !option.hidden);
  if (command.supportsJson === true && !hasJsonOption(command)) {
    options_.push({
      name: "json",
      type: "boolean",
      description: "Print the result as JSON.",
    });
  }
  if (options_.length > 0 || !command.raw) {
    lines.push("");
    lines.push("Options:");
    for (const option of options_) {
      lines.push(
        `  ${pad(formatOptionUsage(option), 26)}${wrapText(
          optionHelp(option),
          Math.max(20, (options.width ?? 80) - 28),
        ).join(`\n${" ".repeat(28)}`)}`,
      );
    }
    lines.push(`  ${pad("-h, --help", 26)}Show help for this command.`);
  }

  if (command.raw) {
    lines.push("");
    lines.push(
      "This command parses its own arguments; pass the remaining arguments through unchanged.",
    );
  }

  if (command.examples && command.examples.length > 0) {
    lines.push("");
    lines.push("Examples:");
    for (const example of command.examples) {
      lines.push(
        `  ${example.command}${example.description ? `  # ${example.description}` : ""}`,
      );
    }
  }

  const source = registry.registrations.find(
    (registration) => registration.command.id === command.id,
  );
  if (source?.pluginId) {
    lines.push("");
    lines.push(`Provided by plugin ${source.pluginId}.`);
  }

  return lines.join("\n");
}

export function formatPathHelp(
  registry: CliCommandRegistry,
  path: string,
  options: HelpOptions = {},
): string {
  const normalized = path.trim().replace(/\s+/g, " ");
  const registration = registry.registrations.find(
    (entry) => entry.command.id === normalized,
  );
  if (registration) {
    return formatCommandHelp(registry, registration.command, options);
  }
  const node = findNode(registry, normalized);
  if (node) {
    const lines = [
      `Usage: riebeckite ${normalized} <command> [options]`,
      "",
      `Commands under ${normalized}:`,
      ...formatNodes(
        node.children,
        "  ",
        options.width ?? 80,
        options.color === true,
      ),
    ];
    return lines.join("\n");
  }
  throw new CliUsageError(`Unknown command: ${normalized}.`, {
    suggestions: suggest(
      normalized,
      registry.registrations.map((entry) => entry.command.id),
    ),
    usage: "Usage: riebeckite help <command>",
  });
}

export function formatUnknownCommand(
  registry: CliCommandRegistry,
  path: string,
): string {
  const suggestions = suggest(
    path,
    registry.registrations.map((entry) => entry.command.id),
  );
  const lines = [`Unknown command: ${path}.`];
  if (suggestions.length > 0) {
    lines.push("", "Did you mean:", ...suggestions.map((name) => `  ${name}`));
  }
  lines.push("", "Run 'riebeckite --help' for available commands.");
  return lines.join("\n");
}

export function formatNodes(
  nodes: readonly CliCommandNode[],
  indent: string,
  width: number,
  color: boolean,
): string[] {
  const lines: string[] = [];
  for (const node of nodes) {
    const hidden = node.command?.command.hidden === true;
    if (!hidden && node.command) {
      const summary = node.command.command.summary;
      const column = Math.max(10, 24 - indent.length);
      const display = pad(node.name, column);
      const colored = color
        ? `\u001b[1m${node.name}\u001b[0m${" ".repeat(
            Math.max(1, column - node.name.length),
          )}`
        : display;
      const wrapped = wrapText(
        summary,
        Math.max(20, width - indent.length - column),
      );
      lines.push(`${indent}${colored}${wrapped[0] ?? ""}`);
      for (const line of wrapped.slice(1)) {
        lines.push(`${indent}${" ".repeat(column)}${line}`);
      }
    } else if (!hidden) {
      lines.push(`${indent}${node.name}`);
    }
    if (node.children.length > 0) {
      lines.push(...formatNodes(node.children, `${indent}  `, width, color));
    }
  }
  return lines;
}
