import { existsSync, readFileSync } from "node:fs";
import {
  ConfigValidationError,
  type ConfigValidationIssue,
} from "@riebeckite/core";

export type AiMutationPolicy = {
  writable?: readonly string[];
  protected?: readonly string[];
};

export type AiIntegrationConfig = {
  mutationPolicy?: AiMutationPolicy;
};

export type ResolvedAiIntegrationConfig = {
  mutationPolicy: {
    writable: readonly string[];
    protected: readonly string[];
  };
};

export type AiSetupContext = {
  name: string;
  title: string;
  description: string;
  baseUrl: string;
  locale: string;
  externalContent?: boolean;
};

export type AiSetupOptions = {
  mcp?: boolean;
  lint?: boolean;
  rules?: boolean;
  skills?: boolean;
  contentDirectory?: string;
};

export type AiSetupFile = {
  path: string;
  content: string;
};

declare module "@riebeckite/core" {
  interface RiebeckiteIntegrations {
    ai?: AiIntegrationConfig;
  }
}

export function defineAiIntegration(
  config: AiIntegrationConfig,
): AiIntegrationConfig {
  return config;
}

export function getAiSetupFiles(
  context: AiSetupContext,
  options: AiSetupOptions = {},
  version = "0.0.0",
): readonly AiSetupFile[] {
  return [
    ...(options.rules ? aiRuleFiles(context, options) : []),
    ...(options.skills ? aiSkillFiles(context, options, version) : []),
  ];
}

export function aiRuleFiles(
  context: AiSetupContext,
  options: AiSetupOptions = {},
): readonly AiSetupFile[] {
  const contentDirectory = options.contentDirectory ?? "content";
  const check = options.lint ? "npm run content:lint" : "npm run check";
  return [
    {
      path: "RIEBECKITE_AI.md",
      content: `# Riebeckite AI guide

## Scope

- Write content only under \`${contentDirectory}/\`.
- Keep generated output and dependencies unchanged.
- Use root-relative Markdown links and preserve existing frontmatter keys.

## Validation

- Run \`${check}\` after changing content.
- Run \`npm run build\` before publishing.

## Site

- Title: ${context.title}
- Default locale: ${context.locale}
`,
    },
    {
      path: "AGENTS.md",
      content: `# Riebeckite project instructions

Read \`RIEBECKITE_AI.md\` before editing. Content lives under \`${contentDirectory}/\`; run \`${check}\` after content changes and \`npm run build\` before publishing.
`,
    },
  ];
}

const skillNames = [
  "riebeckite-site",
  "riebeckite-plugin-catalog",
  "riebeckite-plugin",
  "riebeckite-component",
  "riebeckite-content-migration",
  "riebeckite-deployment",
  "riebeckite-theme",
  "riebeckite-configuration",
  "riebeckite-troubleshooting",
  "riebeckite-upgrade",
] as const;

const assetRoot = existsSync(new URL("./assets/", import.meta.url))
  ? new URL("./assets/", import.meta.url)
  : new URL("../assets/", import.meta.url);

export function aiSkillFiles(
  context: AiSetupContext,
  options: AiSetupOptions = {},
  version = "0.0.0",
): readonly AiSetupFile[] {
  const contentDirectory = options.contentDirectory ?? "content";
  const render = (asset: string) =>
    readFileSync(new URL(`skills/${asset}`, assetRoot), "utf8")
      .replaceAll("{{content-directory}}", contentDirectory)
      .replaceAll("{{riebeckite-version}}", version);
  return skillNames.flatMap((name) => [
    {
      path: `.agents/skills/${name}/SKILL.md`,
      content: render(
        `${name}${name === "riebeckite-site" && context.externalContent ? "-external" : ""}.md`,
      ),
    },
    {
      path: `.agents/skills/${name}/references/guide.md`,
      content: render(`references/${name}.md`),
    },
    {
      path: `.agents/skills/${name}/assets/checklist.md`,
      content: render(`assets/${name}.md`),
    },
  ]);
}

export function resolveAiIntegration(
  value: unknown,
): ResolvedAiIntegrationConfig {
  const issues = validateAiIntegration(value);
  if (issues.length > 0) throw new ConfigValidationError(issues);
  const config = value as AiIntegrationConfig | undefined;
  return {
    mutationPolicy: {
      writable: config?.mutationPolicy?.writable ?? ["**"],
      protected: config?.mutationPolicy?.protected ?? [],
    },
  };
}

export function createMutationPathPolicy(
  policy: ResolvedAiIntegrationConfig["mutationPolicy"],
): (path: string) => boolean {
  return (path) => {
    const normalized = path.replace(/\\/g, "/");
    return (
      !policy.protected.some((pattern) => globMatches(pattern, normalized)) &&
      policy.writable.some((pattern) => globMatches(pattern, normalized))
    );
  };
}

export function validateAiIntegration(value: unknown): ConfigValidationIssue[] {
  const issues: ConfigValidationIssue[] = [];
  if (value === undefined) return issues;
  if (!isRecord(value)) {
    issues.push({
      path: "integrations.ai",
      message: "Expected an object.",
    });
    return issues;
  }
  if (value.mutationPolicy === undefined) return issues;
  if (!isRecord(value.mutationPolicy)) {
    issues.push({
      path: "integrations.ai.mutationPolicy",
      message: "Expected an object.",
    });
    return issues;
  }
  validateStringArray(
    value.mutationPolicy.writable,
    "integrations.ai.mutationPolicy.writable",
    issues,
  );
  validateStringArray(
    value.mutationPolicy.protected,
    "integrations.ai.mutationPolicy.protected",
    issues,
  );
  return issues;
}

function validateStringArray(
  value: unknown,
  path: string,
  issues: ConfigValidationIssue[],
): void {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    issues.push({ path, message: "Expected an array." });
    return;
  }
  for (const [index, item] of value.entries()) {
    if (typeof item !== "string" || !item.trim()) {
      issues.push({
        path: `${path}[${index}]`,
        message: "Expected a non-empty string.",
      });
    }
  }
}

function globMatches(pattern: string, value: string): boolean {
  let expression = "";
  for (let index = 0; index < pattern.length; index++) {
    const character = pattern[index];
    if (character === "*") {
      if (pattern[index + 1] === "*") {
        index++;
        if (pattern[index + 1] === "/") {
          index++;
          expression += "(?:[^/]+/)*";
        } else expression += ".*";
      } else expression += "[^/]*";
    } else if (character === "?") expression += "[^/]";
    else expression += character.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${expression}$`).test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
