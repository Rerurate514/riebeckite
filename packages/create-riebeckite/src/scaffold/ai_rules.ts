import type {
  SiteTemplateFile,
  SiteTemplateOptions,
  SiteTemplateVariables,
} from "./template_types.js";

export function aiRuleFiles(
  variables: SiteTemplateVariables,
  options: SiteTemplateOptions = {},
): readonly SiteTemplateFile[] {
  const contentDirectory = options.contentDirectory ?? "content";
  const check = options.ai?.lint ? "npm run content:lint" : "npm run check";
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

- Title: ${variables.title}
- Default locale: ${variables.locale}
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
