import type {
  CliCommandDefinition,
  CliCommandRegistry,
  CliOptionDefinition,
} from "./types.js";

export type CliShell = "bash" | "zsh" | "powershell";

export type Transition = {
  readonly from: string;
  readonly token: string;
  readonly to: string;
};

export function visibleCommands(
  registry: CliCommandRegistry,
): readonly CliCommandDefinition[] {
  return registry.registrations
    .map((registration) => registration.command)
    .filter((command) => !command.hidden)
    .toSorted((left, right) => left.id.localeCompare(right.id));
}

export function optionWords(option: CliOptionDefinition): string[] {
  if (option.type === "boolean") {
    return option.negatable
      ? [`--${option.name}`, `--no-${option.name}`]
      : [`--${option.name}`];
  }
  const words = [`--${option.name}`];
  if (option.type === "enum") {
    for (const value of option.values ?? []) {
      words.push(`--${option.name}=${value}`);
    }
  }
  return words;
}
