import { PLUGIN_MARKDOWN_GUIDES } from "./content_pages_guides.js";
import {
  codeBlock,
  frontmatter,
  GALLERY_PACKAGE,
  heading,
  PLUGIN_INDEX_URL,
  pluginReadmeUrl,
  read,
  THEMES_INDEX_URL,
  themeReadmeUrl,
} from "./content_pages_shared.js";
import { THEMES, themeGalleryFence } from "./content_pages_themes.js";
import type { ScaffoldLanguage, ScaffoldPreset } from "./presets.js";
import {
  demoPackage,
  hasPlugin,
  README_DEMO_ORDER,
  README_DEMOS,
} from "./readme_demos.js";
import { readmePluginOptions } from "./template_options.js";
import type { SiteTemplateVariables } from "./template_types.js";

type SummaryText = { readonly en: string; readonly ja?: string };

function readSummary(text: SummaryText, language: ScaffoldLanguage): string {
  return language === "ja" ? (text.ja ?? text.en) : text.en;
}

const SHOWCASE_DECK_LINK: SummaryText = {
  en: "This preset also ships a whole-document Marp note. Open the [note](/deck/) or its [standalone slide page](/slides/deck/).",
  ja: "このプリセットには全文が Marp のノートも含まれます。[ノート](/deck/) または [スライド単体ページ](/slides/deck/) を開いてください。",
};

const EXAMPLES_COPY: {
  readonly heading: SummaryText;
  readonly intro: SummaryText;
} = {
  heading: {
    en: "Examples",
    ja: "サンプル集",
  },
  intro: {
    en: "Rendered examples for the diagram, chart, and code features in this preset. Fenced code blocks are turned into output at build time by the relevant plugins, while code blocks gain toolbars from the code plugins. Each section below is copy-pasteable into a Markdown document.",
    ja: "このプリセットに含まれる図表・チャート・コード機能の描画例です。フェンス付きコードブロックは対応するプラグインによりビルド時に出力へ変換され、コードブロックにはツールバーが付きます。以下の各セクションは、Markdown 文書にそのままコピーして使えます。",
  },
};

const SHOWCASE_GUIDE_DEMOS = [
  "@riebeckite/plugin-plantuml",
  "@riebeckite/plugin-excalidraw",
  "@riebeckite/plugin-canvas",
  "@riebeckite/plugin-flashcards",
] as const;

const STARTER_EXAMPLES: {
  readonly heading: SummaryText;
  readonly intro: SummaryText;
  readonly linksHeading: SummaryText;
  readonly linksBody: SummaryText;
  readonly codeHeading: SummaryText;
  readonly codeIntro: SummaryText;
  readonly frontmatterHeading: SummaryText;
  readonly frontmatterBody: SummaryText;
} = {
  heading: {
    en: "Example",
    ja: "サンプル",
  },
  intro: {
    en: "A small page showing what Riebeckite Markdown can do. Copy any section into your own files.",
    ja: "Riebeckite の Markdown でできることをまとめた小さなページです。必要なセクションを自分のファイルにコピーできます。",
  },
  linksHeading: {
    en: "Links",
    ja: "リンク",
  },
  linksBody: {
    en: "WikiLinks connect pages: [[guide]] opens Getting started. Regular Markdown links work as well — [Home](/) returns to the home page.",
    ja: "WikiLink でページをつなげます：[[guide]] は Getting started を開きます。通常の Markdown リンクも使えます — [Home](/) でホームに戻れます。",
  },
  codeHeading: {
    en: "Code",
    ja: "コード",
  },
  codeIntro: {
    en: "A fenced code block keeps its formatting and gains a toolbar from the code plugins:",
    ja: "フェンス付きコードブロックは書式を保ったまま表示され、コード系プラグインでツールバーが付きます：",
  },
  frontmatterHeading: {
    en: "Frontmatter",
    ja: "フロントマター",
  },
  frontmatterBody: {
    en: "The block between the `---` lines at the top of a file controls the page. `publish: true` keeps it in the built site:",
    ja: "ファイル先頭の `---` に挟まれた部分がページを制御します。`publish: true` を書き続けるとビルド対象に残ります：",
  },
};

function starterExamplesContent(language: ScaffoldLanguage): string {
  return [
    frontmatter(),
    heading(1, readSummary(STARTER_EXAMPLES.heading, language)),
    "",
    readSummary(STARTER_EXAMPLES.intro, language),
    "",
    heading(2, readSummary(STARTER_EXAMPLES.linksHeading, language)),
    "",
    readSummary(STARTER_EXAMPLES.linksBody, language),
    "",
    heading(2, readSummary(STARTER_EXAMPLES.codeHeading, language)),
    "",
    readSummary(STARTER_EXAMPLES.codeIntro, language),
    "",
    codeBlock(
      "ts",
      [
        "export function hello(): string {",
        '  return "Hello from Riebeckite";',
        "}",
      ].join("\n"),
    ),
    "",
    heading(2, readSummary(STARTER_EXAMPLES.frontmatterHeading, language)),
    "",
    readSummary(STARTER_EXAMPLES.frontmatterBody, language),
    "",
    codeBlock(
      "yaml",
      ["---", "publish: true", "title: Example", "---"].join("\n"),
    ),
    "",
  ].join("\n");
}

export function examplesContent(
  preset: ScaffoldPreset,
  language: ScaffoldLanguage,
): string {
  if (preset.name === "starter") return starterExamplesContent(language);
  const lines: string[] = [
    frontmatter(),
    heading(1, readSummary(EXAMPLES_COPY.heading, language)),
    "",
    readSummary(EXAMPLES_COPY.intro, language),
    "",
  ];
  for (const key of README_DEMO_ORDER) {
    const packageName = demoPackage(key);
    if (!hasPlugin(preset, packageName)) continue;
    const demo = README_DEMOS[key];
    lines.push(heading(2, readSummary(demo.title, language)), "");
    lines.push(readSummary(demo.intro, language), "");
    lines.push(demo.markdown, "");
    if (preset.name === "showcase" && key === "@riebeckite/plugin-marp") {
      lines.push(readSummary(SHOWCASE_DECK_LINK, language), "");
    }
  }
  if (preset.name === "showcase") {
    for (const packageName of SHOWCASE_GUIDE_DEMOS) {
      if (!hasPlugin(preset, packageName)) continue;
      const guide = PLUGIN_MARKDOWN_GUIDES[packageName];
      if (!guide) continue;
      lines.push(
        heading(2, packageName.replace("@riebeckite/plugin-", "")),
        "",
      );
      lines.push(guide.summary, "");
      lines.push(guide.markdown, "");
    }
  }
  return lines.join("\n");
}

export function referencePluginsContent(
  preset: ScaffoldPreset,
  variables: SiteTemplateVariables,
): string {
  const lines: string[] = [frontmatter()];
  lines.push(heading(1, "Plugin reference"), "");
  lines.push(
    "Every plugin registered by this preset, with the factory and options",
    "used in `riebeckite.config.ts`. Full documentation lives in each package",
    "README.",
    "",
  );
  lines.push("| Package | Factory | Options |");
  lines.push("| --- | --- | --- |");
  for (const plugin of preset.plugins) {
    const options = readmePluginOptions(variables, preset, plugin);
    const cell = options === null ? "—" : `\`${options}\``;
    lines.push(
      `| [\`${plugin.package}\`](${pluginReadmeUrl(plugin.package.replace(/^@riebeckite\/plugin-/, ""))}) | \`${plugin.factory}\` | ${cell} |`,
    );
  }
  lines.push("");

  lines.push(heading(2, "Markdown behavior"), "");
  lines.push(
    "Every registered plugin is listed below with the Markdown that triggers it,",
    "or with the Markdown/frontmatter/content shape it reads when the plugin is",
    "site-wide rather than block-based. Paste the examples into files under",
    "`content/` and run `npm exec riebeckite dev` to inspect the rendered result.",
    "",
  );

  for (const plugin of preset.plugins) {
    const demoKeys = README_DEMO_ORDER.filter(
      (key) => demoPackage(key) === plugin.package,
    );
    const guide = PLUGIN_MARKDOWN_GUIDES[plugin.package];
    const slug = plugin.package.replace(/^@riebeckite\/plugin-/, "");
    lines.push(heading(3, plugin.package), "");
    lines.push(
      `Factory: \`${plugin.factory}\` · [README](${pluginReadmeUrl(slug)})`,
      "",
    );
    if (guide) {
      lines.push(guide.summary, "");
      lines.push(guide.markdown, "");
    }
    for (const key of demoKeys) {
      const demo = README_DEMOS[key];
      lines.push(heading(4, demo.title.en), "");
      lines.push(demo.intro.en, "");
      lines.push(demo.markdown, "");
    }
    if (!guide && demoKeys.length === 0) {
      lines.push(
        "This plugin has no Markdown-specific demo in the scaffold yet. See its package README for the exact behavior and options.",
        "",
      );
    }
  }

  lines.push(`[Riebeckite plugins on GitHub](${PLUGIN_INDEX_URL})`, "");
  lines.push("");
  return lines.join("\n");
}

export function referenceThemesContent(preset: ScaffoldPreset): string {
  const lines: string[] = [frontmatter()];
  lines.push(heading(1, "Theme reference"), "");
  lines.push(
    "The bundled themes. Switch by installing a package and changing the",
    "`theme` factory in `riebeckite.config.ts`.",
    "",
  );
  if (hasPlugin(preset, GALLERY_PACKAGE)) {
    lines.push(heading(2, "Theme gallery"), "");
    lines.push(
      themeGalleryFence((theme) => theme.desc.en),
      "",
    );
  }
  lines.push("| Theme | Factory | Description |");
  lines.push("| --- | --- | --- |");
  for (const theme of THEMES) {
    const packageName = `@riebeckite/theme-${theme.slug}`;
    lines.push(
      `| [\`${packageName}\`](${themeReadmeUrl(theme.slug)}) | \`${theme.factory}\` | ${read(theme.desc, "en")} |`,
    );
  }
  lines.push("");
  lines.push(`[Riebeckite themes on GitHub](${THEMES_INDEX_URL})`, "");
  lines.push("");
  return lines.join("\n");
}
