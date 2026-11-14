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

export function readmeJa(
  preset: ScaffoldPreset,
  variables: SiteTemplateVariables,
): string {
  const words = README_WORDS.ja;
  const lines: string[] = [
    `# ${variables.title}`,
    "",
    README_INTRO[preset.name].ja,
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
      `- **${words.plugins}**（${preset.plugins.length} 個）: ${
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
        "## 最初に編集する場所",
        "",
        variables.contentRepository === undefined
          ? "- Content repository: 記事はこのリポジトリで編集します。"
          : `- \`${variables.contentRepository}\`: 記事を管理する content リポジトリです。`,
        variables.contentRepository === undefined
          ? "- `content/`: ローカル確認用に content リポジトリを clone する場所です。Git の管理対象外です。"
          : `- \`content/\`: ローカル確認用に \`https://github.com/${variables.contentRepository}.git\` を clone する場所です。Git の管理対象外です。`,
        "- `riebeckite.config.ts`: `site.title`、`site.baseUrl`、`content.directory` を設定します。",
        "- `public/favicon.ico`: 必要になったらサイトアイコンを置き換えます。",
        "",
      );
    } else {
      lines.push(
        "## 最初に編集する場所",
        "",
        "- `content/index.md`: 最初に公開されるページです。",
        "- `riebeckite.config.ts`: `site.title`、`site.baseUrl`、`content.directory` を設定します。",
        "- `public/favicon.ico`: 必要になったらサイトアイコンを置き換えます。",
        "",
      );
    }
  }
  if (variables.externalContent === true) {
    lines.push(...deploymentSecretLines("ja"));
  }
  if (preset.readme === "rich") {
    lines.push(...demoPagesLines(preset, variables, words, "ja"));
    lines.push(...copyPasteDemoLines(preset, words, "ja"));
    lines.push(`## ${words.localization}`, "");
    lines.push(words.localizationBody, "");
    lines.push(`## ${words.extending}`, "");
    lines.push(words.extendingBody, "");
    lines.push(
      `- ドキュメント: [English](${REPO}/blob/main/docs/README.md)`,
      `  · [日本語](${REPO}/blob/main/docs/README.ja.md)`,
      "",
    );
  }
  return lines.join("\n");
}
