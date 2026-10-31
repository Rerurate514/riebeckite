import type {
  CliCommandDefinition,
  CliCommandRegistry,
  CliOptionDefinition,
} from "./types.js";

export type CliShell = "bash" | "zsh" | "powershell";

export function generateCompletion(
  registry: CliCommandRegistry,
  shell: CliShell,
  commandName = "riebeckite",
): string {
  const name = /^[A-Za-z0-9_-]+$/.test(commandName)
    ? commandName
    : "riebeckite";
  if (shell === "bash") return bashCompletion(registry, name);
  if (shell === "zsh") return zshCompletion(registry, name);
  return powershellCompletion(registry, name);
}

export function parseCliShell(value: string): CliShell | undefined {
  return value === "bash" || value === "zsh" || value === "powershell"
    ? value
    : undefined;
}

type Transition = {
  readonly from: string;
  readonly token: string;
  readonly to: string;
};

function visibleCommands(
  registry: CliCommandRegistry,
): readonly CliCommandDefinition[] {
  return registry.registrations
    .map((registration) => registration.command)
    .filter((command) => !command.hidden)
    .toSorted((left, right) => left.id.localeCompare(right.id));
}

function transitions(registry: CliCommandRegistry): Transition[] {
  const result: Transition[] = [];
  for (const command of visibleCommands(registry)) {
    const segments = command.id.split(" ");
    let path = "";
    for (const segment of segments) {
      result.push({
        from: path,
        token: segment,
        to: path ? `${path} ${segment}` : segment,
      });
      path = path ? `${path} ${segment}` : segment;
    }
  }
  return result;
}

function childrenOf(registry: CliCommandRegistry, path: string): string[] {
  const prefix = path ? `${path} ` : "";
  const names = new Set<string>();
  for (const command of visibleCommands(registry)) {
    if (!command.id.startsWith(prefix)) continue;
    const remainder = command.id.slice(prefix.length);
    const child = remainder.split(" ")[0];
    if (child) names.add(child);
  }
  return [...names].sort();
}

function commandAt(
  registry: CliCommandRegistry,
  path: string,
): CliCommandDefinition | undefined {
  return visibleCommands(registry).find((command) => command.id === path);
}

function optionWords(option: CliOptionDefinition): string[] {
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

function wordsForPath(registry: CliCommandRegistry, path: string): string[] {
  const words = new Set<string>();
  for (const child of childrenOf(registry, path)) words.add(child);
  const command = commandAt(registry, path);
  if (command) {
    for (const option of command.options ?? []) {
      if (option.hidden) continue;
      for (const word of optionWords(option)) words.add(word);
    }
    if (command.supportsJson === true && !hasJsonOption(command)) {
      words.add("--json");
    }
    words.add("--help");
  }
  if (!path) {
    words.add("--help");
    words.add("--version");
  }
  return [...words].sort();
}

function hasJsonOption(command: CliCommandDefinition): boolean {
  return (command.options ?? []).some((option) => option.name === "json");
}

function allPaths(registry: CliCommandRegistry): string[] {
  const paths = new Set([""]);
  for (const transition of transitions(registry)) {
    paths.add(transition.from);
    paths.add(transition.to);
  }
  return [...paths].sort((left, right) =>
    left === "" ? -1 : right === "" ? 1 : left.localeCompare(right),
  );
}

function enumValueCases(
  registry: CliCommandRegistry,
  shellsafe: (value: string) => string,
): string[] {
  const cases = new Map<string, Set<string>>();
  for (const command of visibleCommands(registry)) {
    for (const option of command.options ?? []) {
      if (option.type !== "enum" || !option.values) continue;
      const existing = cases.get(option.name) ?? new Set<string>();
      for (const value of option.values) existing.add(value);
      cases.set(option.name, existing);
    }
  }
  return [...cases.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(
      ([option, values]) =>
        `    --${shellsafe(option)}) COMPREPLY=( $(compgen -W ${shellSingleQuote(
          [...values].sort().join(" "),
        )} -- "$cur") ); return 0;;`,
    );
}

function bashCompletion(
  registry: CliCommandRegistry,
  commandName: string,
): string {
  const quote = shellSingleQuote;
  const transitionCases = transitions(registry)
    .map(
      (transition) =>
        `      ${quote(`${transition.from} ${transition.token}`)}) path=${quote(
          transition.to,
        )};;`,
    )
    .join("\n");
  const pathCases = allPaths(registry)
    .map(
      (path) =>
        `    ${quote(path)}) COMPREPLY=( $(compgen -W ${quote(
          wordsForPath(registry, path).join(" "),
        )} -- "$cur") );;`,
    )
    .join("\n");

  return `# bash completion for ${commandName}
_${commandName}_completion() {
  local cur prev path i
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"
  path=""
  for ((i=1; i<COMP_CWORD; i++)); do
    case "$path \${COMP_WORDS[i]}" in
${transitionCases}
    esac
  done
  case "$prev" in
${enumValueCases(registry, quote).join("\n")}
  esac
  case "$path" in
${pathCases}
  esac
  return 0
}
complete -F _${commandName}_completion ${commandName}
`;
}

function zshCompletion(
  registry: CliCommandRegistry,
  commandName: string,
): string {
  const transitionCases = transitions(registry)
    .map(
      (transition) =>
        `      ${shellSingleQuote(`${transition.from} ${transition.token}`)}) path=${shellSingleQuote(
          transition.to,
        )};;`,
    )
    .join("\n");
  const pathCases = allPaths(registry)
    .map((path) => {
      const words = wordsForPath(registry, path).map((word) => {
        const command = commandAt(
          registry,
          path === "" ? word : `${path} ${word}`,
        );
        return command
          ? `${word}:${sanitizeDescription(command.summary)}`
          : word;
      });
      return `    ${shellSingleQuote(path)}) _values 'completion' ${words
        .map((word) => shellSingleQuote(word))
        .join(" ")};;`;
    })
    .join("\n");
  const enumCases = new Map<string, Set<string>>();
  for (const command of visibleCommands(registry)) {
    for (const option of command.options ?? []) {
      if (option.type !== "enum" || !option.values) continue;
      const values = enumCases.get(option.name) ?? new Set<string>();
      for (const value of option.values) values.add(value);
      enumCases.set(option.name, values);
    }
  }
  const enumValueCases = [...enumCases.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(
      ([option, values]) =>
        `    --${option}) _values 'value' ${[...values]
          .sort()
          .map((value) => shellSingleQuote(value))
          .join(" ")}; return;;`,
    )
    .join("\n");

  return `#compdef ${commandName}
_${commandName}() {
  local path="" i cur prev
  cur="$words[CURRENT]"
  prev="$words[CURRENT-1]"
  for ((i=2; i<CURRENT; i++)); do
    case "$path $words[i]" in
${transitionCases}
    esac
  done
  case "$prev" in
${enumValueCases}
  esac
  case "$path" in
${pathCases}
  esac
}
_${commandName} "$@"
`;
}

function powershellCompletion(
  registry: CliCommandRegistry,
  commandName: string,
): string {
  const transitionCases = transitions(registry)
    .map(
      (transition) =>
        `      ${powershellSingleQuote(`${transition.from} ${transition.token}`)} { $path = ${powershellSingleQuote(transition.to)} }`,
    )
    .join("\n");
  const pathCases = allPaths(registry)
    .map(
      (path) =>
        `    ${powershellSingleQuote(path)} { @(${wordsForPath(registry, path)
          .map((word) => powershellSingleQuote(word))
          .join(", ")}) }`,
    )
    .join("\n");

  return `Register-ArgumentCompleter -Native -CommandName ${commandName} -ScriptBlock {
  param($wordToComplete, $commandAst, $cursorPosition)
  $elements = @($commandAst.CommandElements | Select-Object -Skip 1 | ForEach-Object { $_.ToString() })
  if ($elements.Count -gt 0 -and $elements[-1] -eq $wordToComplete) {
    $elements = @($elements | Select-Object -SkipLast 1)
  }
  $path = ''
  foreach ($element in $elements) {
    switch ("$path $element") {
${transitionCases}
    }
  }
  $candidates = switch ($path) {
${pathCases}
    default { @() }
  }
  $candidates |
    Where-Object { $_ -like "$wordToComplete*" } |
    ForEach-Object {
      [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
    }
}
`;
}

function shellSingleQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function powershellSingleQuote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function sanitizeDescription(value: string): string {
  return value.replace(/[\r\n]+/g, " ").replace(/:/g, " -");
}
