import { ROOT_USAGE, suggest } from "./cli_parse_usage.js";

export { ROOT_USAGE, suggest } from "./cli_parse_usage.js";

import { parseCommandInput } from "./cli_parse_input.js";
import { CliUsageError } from "./errors.js";
import { commandPathSegments, normalizeCommandId } from "./registry.js";
import type {
  CliCommandRegistration,
  CliCommandRegistry,
  CliCommandResolution,
} from "./types.js";

export function resolveCliCommand(
  registry: CliCommandRegistry,
  argv: readonly string[],
): CliCommandResolution {
  if (argv.length === 0) return { kind: "root-help" };
  if (argv[0] === "--help" || argv[0] === "-h") return { kind: "root-help" };
  if (argv[0] === "--version" || argv[0] === "-v") return { kind: "version" };

  const match = matchCommand(registry, argv);
  if (!match) {
    const first = argv[0] ?? "";
    if (first.startsWith("-")) {
      throw new CliUsageError(`Unknown option: ${first}.`, {
        suggestions: suggest(
          first.replace(/^-+/, ""),
          registry.registrations.flatMap((registration) =>
            (registration.command.options ?? []).map((option) => option.name),
          ),
        ).map((name) => `--${name}`),
        usage: ROOT_USAGE,
      });
    }
    const known = commandPaths(registry);
    const typed = commandTokens(argv);
    const target = typed.length > 0 ? typed : [first];
    throw new CliUsageError(`Unknown command: ${target.join(" ")}.`, {
      commandPath: target.join(" "),
      suggestions: suggest(target.join(" "), known),
      usage: ROOT_USAGE,
    });
  }

  const remaining = argv.slice(match.length);
  const parsed = parseCommandInput(match.registration, remaining, registry);
  if (parsed.kind === "help") {
    return {
      kind: "help",
      command: match.registration.command,
      path: match.registration.command.id,
    };
  }
  return {
    kind: "command",
    registration: match.registration,
    input: parsed.input,
  };
}

export function commandPaths(registry: CliCommandRegistry): string[] {
  const paths = new Set<string>();
  for (const registration of registry.registrations) {
    paths.add(registration.command.id);
  }
  for (const alias of registry.aliases.keys()) paths.add(alias);
  return [...paths].sort();
}

export function matchCommand(
  registry: CliCommandRegistry,
  argv: readonly string[],
):
  | {
      readonly registration: CliCommandRegistration;
      readonly length: number;
    }
  | undefined {
  const candidates: {
    segments: readonly string[];
    registration: CliCommandRegistration;
  }[] = registry.registrations.map((registration) => ({
    segments: commandPathSegments(registration.command.id),
    registration,
  }));
  for (const [alias, target] of registry.aliases) {
    const registration = registry.registrations.find(
      (entry) => entry.command.id === target,
    );
    if (registration) {
      candidates.push({
        segments: commandPathSegments(alias),
        registration,
      });
    }
  }

  let best:
    | { readonly registration: CliCommandRegistration; readonly length: number }
    | undefined;
  for (const candidate of candidates) {
    if (candidate.segments.length > argv.length) continue;
    let matches = true;
    for (let index = 0; index < candidate.segments.length; index += 1) {
      if (
        normalizeCommandId(argv[index] ?? "") !== candidate.segments[index] ||
        (argv[index] ?? "").startsWith("-")
      ) {
        matches = false;
        break;
      }
    }
    if (!matches) continue;
    if (!best || candidate.segments.length > best.length) {
      best = {
        registration: candidate.registration,
        length: candidate.segments.length,
      };
    }
  }
  return best;
}

export function commandTokens(argv: readonly string[]): string[] {
  const tokens: string[] = [];
  for (const token of argv) {
    if (token.startsWith("-")) break;
    tokens.push(token);
  }
  return tokens;
}
