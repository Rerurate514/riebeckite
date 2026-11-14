import type {
  IconPrecedence,
  IconSource,
  IconsOptions,
  ResolvedIconsOptions,
} from "./types.js";

export const DEFAULT_PRECEDENCE: readonly IconPrecedence[] = [
  "config",
  "frontmatter",
  "iconic",
  "iconize",
];
export const SOURCES = new Set<IconSource>(["iconize", "iconic"]);
export const PRECEDENCE = new Set<IconPrecedence>([
  "config",
  "frontmatter",
  "iconic",
  "iconize",
]);

export function resolveIconsOptions(
  options: IconsOptions | undefined,
): ResolvedIconsOptions {
  const sources: readonly IconSource[] = options?.sources?.length
    ? [...new Set(options.sources)]
    : ["iconize", "iconic"];
  const precedence = options?.precedence?.length
    ? [...new Set(options.precedence)]
    : [...DEFAULT_PRECEDENCE];
  return {
    sources,
    inline: options?.inline !== false,
    frontmatter: options?.frontmatter !== false,
    colors: options?.colors !== false,
    precedence,
    overrides: options?.overrides ?? {},
    ...(options?.vaultRoot === undefined
      ? {}
      : { vaultRoot: options.vaultRoot }),
    ...(options?.vaultPrefix === undefined
      ? {}
      : { vaultPrefix: options.vaultPrefix }),
    iconize: {
      enabled:
        sources.includes("iconize") && options?.iconize?.enabled !== false,
      ...(options?.iconize?.dataFile === undefined
        ? {}
        : { dataFile: options.iconize.dataFile }),
      ...(options?.iconize?.iconPacks === undefined
        ? {}
        : { iconPacks: options.iconize.iconPacks }),
    },
    iconic: {
      enabled: sources.includes("iconic") && options?.iconic?.enabled !== false,
      ...(options?.iconic?.dataFile === undefined
        ? {}
        : { dataFile: options.iconic.dataFile }),
    },
  };
}
