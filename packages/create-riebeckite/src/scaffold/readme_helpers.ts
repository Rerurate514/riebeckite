import { defaultLanguageForLocale } from "./presets_languages.js";
import type { ScaffoldPreset } from "./presets_types.js";
import {
  demoPackage,
  ENGLISH_ONLY_PAGES,
  hasPlugin,
  README_DEMO_ORDER,
  README_DEMOS,
} from "./readme_demos.js";
import { README_PAGE_LINKS, REPO } from "./readme_text.js";
import { readmePluginOptions } from "./template_options.js";
import type { SiteTemplateVariables } from "./template_types.js";
import { GITHUB_ACTIONS_SECRETS } from "./wrangler-defaults.js";

export function deploymentSecretLines(
  language: "en" | "ja",
): readonly string[] {
  if (language === "ja") {
    return [
      "## デプロイ用の設定",
      "",
      "GitHub Actions のデプロイは content repository を読み、Cloudflare へ配信します。初回実行の前に、次の secret と variable を登録してください。",
      "",
      `- \`${GITHUB_ACTIONS_SECRETS.RIEBECKITE_CONTENT_READ_TOKEN}\`（secret）— **この Site Repository** に登録します。content repository が private / internal のときだけ必要です。content repository に限定した fine-grained token を作成し、**Contents: read** を付与します。`,
      "- `RIEBECKITE_APP_ID` と `RIEBECKITE_APP_PRIVATE_KEY`（secret）— **content repository** に登録します。GitHub App の短期トークンでこの Site へ更新を通知します。App の Repository permissions は **Contents: read and write** にします。",
      `- \`${GITHUB_ACTIONS_SECRETS.SITE_DISPATCH_TOKEN}\`（secret、任意）— GitHub App を使わない場合のフォールバックです。**content repository** に登録し、この Site Repository に限定した fine-grained token の **Contents: read and write** を付与します。`,
      `- \`${GITHUB_ACTIONS_SECRETS.CLOUDFLARE_API_TOKEN}\`（secret）— **この Site Repository** に登録し、Cloudflare へのデプロイに使います。`,
      `- \`${GITHUB_ACTIONS_SECRETS.CLOUDFLARE_ACCOUNT_ID}\`（variable）— **この Site Repository** の Actions variable に登録します。秘密情報ではありません。`,
      "",
      `workflow はこれらの名前を参照するだけで、値は含みません。値は絶対に commit しないでください。全体の手順は [別 Content Repository のガイド](${REPO}/blob/main/docs/docs/guides/deployment/separate-content-repository.md) を参照してください。`,
      "",
    ];
  }
  return [
    "## Deployment configuration",
    "",
    "The GitHub Actions deployment reads the content repository and deploys to Cloudflare. Add these secrets and variables before the first run:",
    "",
    `- \`${GITHUB_ACTIONS_SECRETS.RIEBECKITE_CONTENT_READ_TOKEN}\` (secret) — in **this site repository**. Required only when the content repository is private or internal. Use a fine-grained token scoped to the content repository with **Contents: read**.`,
    "- `RIEBECKITE_APP_ID` and `RIEBECKITE_APP_PRIVATE_KEY` (secrets) — in the **content repository**. A GitHub App mints short-lived tokens to dispatch updates to this site. Set the App's repository permission **Contents: read and write**.",
    `- \`${GITHUB_ACTIONS_SECRETS.SITE_DISPATCH_TOKEN}\` (secret, optional) — fallback when you do not use a GitHub App. Add it to the **content repository** as a fine-grained token scoped to this site repository with **Contents: read and write**.`,
    `- \`${GITHUB_ACTIONS_SECRETS.CLOUDFLARE_API_TOKEN}\` (secret) — in **this site repository** for the Cloudflare deploy.`,
    `- \`${GITHUB_ACTIONS_SECRETS.CLOUDFLARE_ACCOUNT_ID}\` (variable) — in **this site repository's** Actions variables. It is not a secret.`,
    "",
    `The workflows reference these names and never contain their values. Never commit the values. See the [separate content repository guide](${REPO}/blob/main/docs/docs/guides/deployment/separate-content-repository.md) for the full setup.`,
    "",
  ];
}

export function languagesLabel(
  preset: ScaffoldPreset,
  variables: SiteTemplateVariables,
  words: Record<string, string>,
): string {
  if (preset.languages.length === 0) return words.none;
  if (preset.languages.length === 1) {
    const language =
      preset.name === "starter"
        ? defaultLanguageForLocale(variables.locale)
        : preset.languages[0];
    return `${language} (${words.single})`;
  }
  return preset.languages.join(", ");
}

export function pagesLabel(preset: ScaffoldPreset): string | null {
  if (preset.contentPages.length === 0) return null;
  return preset.contentPages
    .map((page) => (page === "index" ? "/" : `/${page}`))
    .join(", ");
}

export function configurationReferenceLines(
  preset: ScaffoldPreset,
  variables: SiteTemplateVariables,
  words: Record<string, string>,
): string[] {
  const lines: string[] = [
    `## ${words.configReference}`,
    "",
    words.configReferenceBody,
    "",
  ];
  if (preset.theme) {
    const themeCall = preset.theme.options
      ? `${preset.theme.factory}(${preset.theme.options})`
      : `${preset.theme.factory}()`;
    lines.push(`- **${words.theme}**: \`${themeCall}\``, "");
  }
  lines.push(
    `| Package | ${words.factory} | ${words.options} |`,
    "| --- | --- | --- |",
  );
  for (const plugin of preset.plugins) {
    const options = readmePluginOptions(variables, preset, plugin);
    const cell = options === null ? words.emDash : `\`${options}\``;
    lines.push(`| \`${plugin.package}\` | \`${plugin.factory}\` | ${cell} |`);
  }
  lines.push("");
  return lines;
}

export function demoPagesLines(
  preset: ScaffoldPreset,
  variables: SiteTemplateVariables,
  words: Record<string, string>,
  language: "en" | "ja",
): string[] {
  const lines: string[] = [
    `## ${words.demoPages}`,
    "",
    words.demoPagesBody,
    "",
  ];
  const defaultLang = defaultLanguageForLocale(variables.locale);
  const pages = preset.contentPages.filter((page) => page !== "index");
  for (const page of pages) {
    const label = README_PAGE_LINKS[page]?.[language] ?? `/${page}/`;
    const suffix =
      ENGLISH_ONLY_PAGES.has(page) && defaultLang !== "en" ? ".en" : "";
    const source = `content/${page}${suffix}.md`;
    const url = `/${page}/`;
    lines.push(`- [**${label}**](${source}) — live at [\`${url}\`](${url})`);
  }
  lines.push("");
  return lines;
}

export function copyPasteDemoLines(
  preset: ScaffoldPreset,
  words: Record<string, string>,
  language: "en" | "ja",
): string[] {
  const lines: string[] = [
    `## ${words.copyDemos}`,
    "",
    words.copyDemosBody,
    "",
  ];
  for (const key of README_DEMO_ORDER) {
    const packageName = demoPackage(key);
    if (!hasPlugin(preset, packageName)) continue;
    const demo = README_DEMOS[key];
    lines.push(`### ${demo.title[language]}`, "");
    lines.push(demo.intro[language], "");
    lines.push(demo.markdown, "");
  }
  return lines;
}
