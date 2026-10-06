import { copyTemplateTree } from "./template-loader.js";
import type { SiteTemplateFile } from "./templates.js";

export const SCAFFOLD_UTILITY_NAMES = [
  "editorconfig",
  "gitattributes",
  "biome",
  "npmrc",
  "vscode",
] as const;

export type ScaffoldUtilityName = (typeof SCAFFOLD_UTILITY_NAMES)[number];

export type ScaffoldUtilitySummary = {
  readonly name: ScaffoldUtilityName;
  readonly label: string;
  readonly description: string;
};

export const SCAFFOLD_UTILITIES: readonly ScaffoldUtilitySummary[] = [
  {
    name: "editorconfig",
    label: ".editorconfig",
    description: "Shared editor indentation, newline, and encoding defaults.",
  },
  {
    name: "gitattributes",
    label: ".gitattributes",
    description: "Line-ending normalization and text detection for Git.",
  },
  {
    name: "biome",
    label: "biome.json",
    description: "Biome formatter and linter configuration.",
  },
  {
    name: "npmrc",
    label: ".npmrc",
    description: "npm settings such as exact dependency versions.",
  },
  {
    name: "vscode",
    label: ".vscode/settings.json",
    description: "Recommended VS Code workspace settings.",
  },
];

export const SCAFFOLD_DEFAULT_UTILITIES: readonly ScaffoldUtilityName[] = [
  "editorconfig",
  "gitattributes",
  "biome",
];

export const SCAFFOLD_NO_UTILITIES = "none";

export function isScaffoldUtilityName(
  value: string,
): value is ScaffoldUtilityName {
  return (SCAFFOLD_UTILITY_NAMES as readonly string[]).includes(value);
}

export function parseScaffoldUtilities(
  value: string,
): readonly ScaffoldUtilityName[] {
  const tokens = value
    .split(",")
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  if (tokens.length === 0) {
    throw new Error(
      "--utilities requires a comma-separated list of utility names.",
    );
  }
  if (tokens.length === 1 && tokens[0] === SCAFFOLD_NO_UTILITIES) {
    return [];
  }

  const utilities: ScaffoldUtilityName[] = [];
  for (const token of tokens) {
    if (token === SCAFFOLD_NO_UTILITIES) {
      throw new Error(
        `"${SCAFFOLD_NO_UTILITIES}" cannot be combined with other utility names.`,
      );
    }
    if (!isScaffoldUtilityName(token)) {
      throw new Error(
        `Unknown utility: ${token}. ` +
          `Available utilities: ${SCAFFOLD_UTILITY_NAMES.join(", ")}, ${SCAFFOLD_NO_UTILITIES}.`,
      );
    }
    if (!utilities.includes(token)) utilities.push(token);
  }
  return utilities;
}

export function utilityTemplateFiles(
  utilities: readonly ScaffoldUtilityName[],
): readonly SiteTemplateFile[] {
  const seen = new Set<string>();
  const files: SiteTemplateFile[] = [];
  for (const name of utilities) {
    for (const file of copyTemplateTree(`utilities/${name}`)) {
      if (seen.has(file.path)) continue;
      seen.add(file.path);
      files.push(file);
    }
  }
  return files;
}
