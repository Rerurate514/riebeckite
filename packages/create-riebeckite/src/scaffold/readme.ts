import {
  defaultLanguageForLocale,
  type ScaffoldPreset,
  type ScaffoldPresetName,
} from "./presets.js";
import {
  demoPackage,
  ENGLISH_ONLY_PAGES,
  hasPlugin,
  README_DEMO_ORDER,
  README_DEMOS,
} from "./readme_demos.js";
import { readmePluginOptions } from "./template_options.js";
import type { SiteTemplateVariables } from "./template_types.js";
import { GITHUB_ACTIONS_SECRETS } from "./wrangler-defaults.js";

const REPO = "https://github.com/Rerurate514/riebeckite";

const README_PAGE_LINKS: Readonly<
  Record<string, { readonly en: string; readonly ja: string }>
> = {
  "framework/plugins": { en: "Plugin tour", ja: "プラグインツアー" },
  "framework/themes": { en: "Theme tour", ja: "テーマツアー" },
  guide: { en: "Getting-started guide", ja: "はじめにガイド" },
  examples: { en: "Examples", ja: "サンプル集" },
  "reference/plugins": { en: "Plugin reference", ja: "プラグインリファレンス" },
  "reference/themes": { en: "Theme reference", ja: "テーマリファレンス" },
};

const README_INTRO: Readonly<
  Record<ScaffoldPresetName, { readonly en: string; readonly ja: string }>
> = {
  empty: {
    en: "A blank Riebeckite application shell — no theme, no plugins, no components, and no content. Everything is yours to add.",
    ja: "空の Riebeckite アプリケーションシェルです。テーマもプラグインもコンポーネントもコンテンツもなく、すべてを自由に追加できます。",
  },
  minimal: {
    en: "The smallest readable Riebeckite site: Obsidian Markdown, the minimal theme, and a single page you can read end to end.",
    ja: "最小で読みやすい Riebeckite サイトです。Obsidian マークダウン・minimal テーマ・1 ページだけで、サイトの組み立て方を学べます。",
  },
  starter: {
    en: "Recommended default: a practical Markdown garden with search, navigation, and reading essentials.",
    ja: "大半のサイトにおすすめの既定構成です。検索・ナビゲーション・閲覧に必要な機能を備えた実用的な Markdown サイトを作れます。",
  },
  "digital-garden": {
    en: "An Obsidian-compatible digital garden with linked notes, backlinks, and a local graph.",
    ja: "Obsidian と互換性のあるデジタルガーデンです。ノート間リンク、バックリンク、ローカルグラフを備えます。",
  },
  blog: {
    en: "A publishing-focused blog with tags, series, related posts, sharing, and feeds.",
    ja: "タグ、シリーズ、関連記事、共有、フィードを備えた公開向けブログです。",
  },
  docs: {
    en: "A documentation site with an automatic sidebar, table of contents, and previous/next navigation.",
    ja: "自動サイドバー、目次、前後ページナビゲーションを備えたドキュメントサイトです。",
  },
  showcase: {
    en: "A feature-rich example that demonstrates the Riebeckite plugin ecosystem with rendered samples, reference pages, and local fixtures.",
    ja: "Riebeckite の Plugin エコシステムを実際に確認できる機能紹介用の構成です。描画例・リファレンスページ・ローカルのフィクスチャを含みます。",
  },
};

const README_WORDS: Readonly<{
  en: Record<string, string>;
  ja: Record<string, string>;
}> = {
  en: {
    included: "What's included",
    languages: "Languages",
    theme: "Theme",
    plugins: "Plugins",
    pages: "Content pages",
    commands: "Commands",
    localization: "Localization",
    localizationBody:
      "Content lives in `content/` as plain Markdown. Translations sit next to the default file using the `<base>.<lang>.md` convention (`about.ja.md`, `about.en.md`). The default language keeps the unsuffixed path; the rest are served under `/lang/`. To add or remove a language, edit the `l10n(...)` plugin in `riebeckite.config.ts` and add or remove the matching translation files.",
    extending: "Extending",
    extendingBody:
      "Plugins and themes are registered in `riebeckite.config.ts`. Install a package, import its factory, and add it to the `plugins` array — or point `theme` at another theme factory. See the Riebeckite repository for the full plugin and theme index.",
    none: "none",
    noPlugins: "no plugins",
    single: "single language",
    configReference: "Configuration reference",
    configReferenceBody:
      "`riebeckite.config.ts` registers every plugin below with its full option set. Treat it as a starting point; the documented options live in the [configuration reference](https://riebeckite.dev/docs/reference/configuration-reference) and each plugin's package README.",
    factory: "Factory",
    options: "Options",
    emDash: "—",
    demoPages: "Try the demos",
    demoPagesBody:
      "The generated site ships content pages that exercise these features:",
    copyDemos: "Copy-paste demos",
    copyDemosBody:
      "Paste any of these snippets into a Markdown file under `content/` and run `npm exec riebeckite dev`. Each one renders through a plugin this preset registers.",
  },
  ja: {
    included: "含まれているもの",
    languages: "言語",
    theme: "テーマ",
    plugins: "プラグイン",
    pages: "コンテンツページ",
    commands: "コマンド",
    localization: "ローカライズ",
    localizationBody:
      "コンテンツは `content/` にプレーンな Markdown として置きます。翻訳ページは既定ファイルの隣に `<base>.<lang>.md` の規則で配置します（`about.ja.md`、`about.en.md` など）。既定言語は接尾辞なしのパス、それ以外は `/lang/` のパスで配信されます。言語の追加・削除は `riebeckite.config.ts` の `l10n(...)` プラグインを編集し、対応する翻訳ファイルを追加・削除してください。",
    extending: "拡張",
    extendingBody:
      "プラグインとテーマは `riebeckite.config.ts` で登録します。パッケージをインストールし、ファクトリを import して `plugins` 配列に追加するか、`theme` を別のテーマファクトリに変更します。全プラグイン・テーマの一覧は Riebeckite リポジトリを参照してください。",
    none: "なし",
    noPlugins: "プラグインなし",
    single: "単一言語",
    configReference: "設定リファレンス",
    configReferenceBody:
      "`riebeckite.config.ts` には、以下の全プラグインが全オプション付きで登録されています。これは出発点として使い、設定の仕様は[設定リファレンス](https://riebeckite.dev/docs/reference/configuration-reference)と各プラグインパッケージの README を確認してください。",
    factory: "ファクトリ",
    options: "オプション",
    emDash: "—",
    demoPages: "デモを試す",
    demoPagesBody:
      "生成されたサイトには、各機能を体験できるコンテンツページが含まれています:",
    copyDemos: "コピーして使えるデモ",
    copyDemosBody:
      "以下のスニペットを `content/` 配下の Markdown ファイルに貼り付けて `npm exec riebeckite dev` を実行してください。それぞれ、このプリセットが登録しているプラグインでレンダリングされます。",
  },
};

export function readme(
  preset: ScaffoldPreset,
  variables: SiteTemplateVariables,
): string {
  const ja = defaultLanguageForLocale(variables.locale) === "ja";
  return ja ? readmeJa(preset, variables) : readmeEn(preset, variables);
}

function readmeEn(
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
    lines.push(
      "## First edits",
      "",
      "- `content/index.md`: the first published page.",
      "- `riebeckite.config.ts`: set `site.title`, `site.baseUrl`, and `content.directory`.",
      "- `public/favicon.ico`: replace the site icon when you are ready.",
      "",
    );
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

function readmeJa(
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
    lines.push(
      "## 最初に編集する場所",
      "",
      "- `content/index.md`: 最初に公開されるページです。",
      "- `riebeckite.config.ts`: `site.title`、`site.baseUrl`、`content.directory` を設定します。",
      "- `public/favicon.ico`: 必要になったらサイトアイコンを置き換えます。",
      "",
    );
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

function deploymentSecretLines(language: "en" | "ja"): readonly string[] {
  if (language === "ja") {
    return [
      "## デプロイ用 Secret",
      "",
      "GitHub Actions のデプロイは content repository を読み、Cloudflare へ配信します。初回実行の前に、次の repository secret を登録してください。",
      "",
      `- \`${GITHUB_ACTIONS_SECRETS.RIEBECKITE_CONTENT_READ_TOKEN}\` — **この Site Repository** に登録します。content repository が private / internal のときだけ必要です。content repository に限定した fine-grained token を作成し、**Contents: read** を付与します。`,
      `- \`${GITHUB_ACTIONS_SECRETS.SITE_DISPATCH_TOKEN}\` — **content repository** に登録します。content repository の \`notify-site.yml\` からこの Site へ更新を通知するために使います。この Site Repository に限定した fine-grained token を作成し、**Contents: read and write** を付与します。`,
      `- \`${GITHUB_ACTIONS_SECRETS.CLOUDFLARE_API_TOKEN}\` と \`${GITHUB_ACTIONS_SECRETS.CLOUDFLARE_ACCOUNT_ID}\` — **この Site Repository** に登録し、Cloudflare へのデプロイに使います。`,
      "",
      `workflow はこれらの secret 名を参照するだけで、値は含みません。値は絶対に commit しないでください。全体の手順は [別 Content Repository のガイド](${REPO}/blob/main/docs/docs/guides/deployment/separate-content-repository.md) を参照してください。`,
      "",
    ];
  }
  return [
    "## Deployment secrets",
    "",
    "The GitHub Actions deployment reads the content repository and deploys to Cloudflare. Add these repository secrets before the first run:",
    "",
    `- \`${GITHUB_ACTIONS_SECRETS.RIEBECKITE_CONTENT_READ_TOKEN}\` — in **this site repository**. Required only when the content repository is private or internal. Use a fine-grained token scoped to the content repository with **Contents: read**.`,
    `- \`${GITHUB_ACTIONS_SECRETS.SITE_DISPATCH_TOKEN}\` — in the **content repository**. Lets its \`notify-site.yml\` dispatch updates to this site. Use a fine-grained token scoped to this site repository with **Contents: read and write**.`,
    `- \`${GITHUB_ACTIONS_SECRETS.CLOUDFLARE_API_TOKEN}\` and \`${GITHUB_ACTIONS_SECRETS.CLOUDFLARE_ACCOUNT_ID}\` — in **this site repository** for the Cloudflare deploy.`,
    "",
    `The workflows reference these secret names and never contain their values. Never commit the values. See the [separate content repository guide](${REPO}/blob/main/docs/docs/guides/deployment/separate-content-repository.md) for the full setup.`,
    "",
  ];
}

function languagesLabel(
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

function pagesLabel(preset: ScaffoldPreset): string | null {
  if (preset.contentPages.length === 0) return null;
  return preset.contentPages.map((page) => `/${page}`).join(", ");
}

function configurationReferenceLines(
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

function demoPagesLines(
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

function copyPasteDemoLines(
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
