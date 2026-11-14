import type { ScaffoldPreset } from "./presets_types.js";
import {
  configurationReferenceLines,
  copyPasteDemoLines,
  demoPagesLines,
  deploymentSecretLines,
  languagesLabel,
  pagesLabel,
} from "./readme_helpers.js";
import { README_INTRO, README_WORDS, REPO } from "./readme_text.js";
import type { SiteTemplateVariables } from "./template_types.js";

export function readmeEn(
  preset: ScaffoldPreset,
  variables: SiteTemplateVariables,
): string {
  const words = README_WORDS.en;
  const lines: string[] = [
    `# ${variables.title}`,
    "",
    README_INTRO[preset.name].en,
    "",
  ];
  if (preset.readme !== "short") {
    lines.push(`## ${words.included}`, "");
    lines.push(
      `- **${words.languages}**: ${languagesLabel(preset, variables, words)}`,
    );
    lines.push(
      `- **${words.theme}**: ${preset.theme ? `\`${preset.theme.package}\`` : words.none}`,
    );
    lines.push(
      `- **${words.plugins}** (${preset.plugins.length}): ${
        preset.plugins.length === 0
          ? words.noPlugins
          : preset.plugins.map((p) => `\`${p.package}\``).join(", ")
      }`,
    );
    lines.push(`- **${words.pages}**: ${pagesLabel(preset) ?? words.none}`);
    lines.push("");
    if (preset.readme === "rich") {
      lines.push(...configurationReferenceLines(preset, variables, words));
    }
  }
  lines.push(`## ${words.commands}`, "");
  lines.push(
    "```sh",
    "npm install",
    "npm exec riebeckite check",
    "npm exec riebeckite dev",
    "npm exec riebeckite build",
    "```",
    "",
  );
  if (preset.name !== "empty") {
    if (variables.externalContent === true) {
      lines.push(
        "## First edits",
        "",
        variables.contentRepository === undefined
          ? "- The content repository holds the articles."
          : `- \`${variables.contentRepository}\`: the content repository that holds the articles.`,
        variables.contentRepository === undefined
          ? "- `content/`: clone the content repository here for local preview. This directory is ignored by Git."
          : `- \`content/\`: clone \`https://github.com/${variables.contentRepository}.git\` here for local preview. This directory is ignored by Git.`,
        "- `riebeckite.config.ts`: set `site.title`, `site.baseUrl`, and `content.directory`.",
        "- `public/favicon.ico`: replace the site icon when you are ready.",
        "",
      );
    } else {
      lines.push(
        "## First edits",
        "",
        "- `content/index.md`: the first published page.",
        "- `riebeckite.config.ts`: set `site.title`, `site.baseUrl`, and `content.directory`.",
        "- `public/favicon.ico`: replace the site icon when you are ready.",
        "",
      );
    }
  }
  if (variables.externalContent === true) {
    lines.push(...deploymentSecretLines("en"));
  }
  if (preset.readme === "rich") {
    lines.push(...demoPagesLines(preset, variables, words, "en"));
    lines.push(...copyPasteDemoLines(preset, words, "en"));
    lines.push(`## ${words.localization}`, "");
    lines.push(words.localizationBody, "");
    lines.push(`## ${words.extending}`, "");
    lines.push(words.extendingBody, "");
    lines.push(
      `- Docs: [English](${REPO}/blob/main/docs/README.md)`,
      `  · [日本語](${REPO}/blob/main/docs/README.ja.md)`,
      "",
    );
  }
  return lines.join("\n");
}
