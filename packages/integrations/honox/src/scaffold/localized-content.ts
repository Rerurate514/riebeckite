import {
  defaultLanguageForLocale,
  SCAFFOLD_LANGUAGES,
  type ScaffoldLanguage,
  type ScaffoldPreset,
} from "./presets.js";
import {
  demoPackage,
  fence,
  hasPlugin,
  README_DEMO_ORDER,
  README_DEMOS,
  readmePluginOptions,
  type SiteTemplateFile,
  type SiteTemplateVariables,
} from "./templates.js";

const HELPERS = {
  en: "https://github.com/Rerurate514/riebeckite/blob/main/docs/en/README.md",
  ja: "https://github.com/Rerurate514/riebeckite/blob/main/docs/ja/README.md",
};

const PLUGIN_INDEX_URL =
  "https://github.com/Rerurate514/riebeckite/tree/main/packages/plugins";
const THEMES_INDEX_URL =
  "https://github.com/Rerurate514/riebeckite/tree/main/packages/themes";
const GALLERY_PACKAGE = "@riebeckite/plugin-gallery";

const PLUGIN_MARKDOWN_GUIDES: Readonly<
  Record<string, { readonly summary: string; readonly markdown: string }>
> = {
  "@riebeckite/plugin-color-mode": {
    summary:
      "Adds the light/dark/system color-mode control to the app shell. Markdown does not need special syntax; every page inherits the toggle.",
    markdown:
      "Write any page normally. Use the color-mode control in the header to see the same Markdown under light and dark tokens.",
  },
  "@riebeckite/plugin-l10n": {
    summary:
      "Routes translated Markdown files by language suffix and keeps the default-language file unsuffixed.",
    markdown: fence(
      "text",
      [
        "content/about.md       # default language",
        "content/about.ja.md    # Japanese version served under /ja/about/",
        "content/about.fr.md    # French version served under /fr/about/",
      ].join("\n"),
    ),
  },
  "@riebeckite/plugin-seo": {
    summary:
      "Turns Markdown frontmatter and site config into metadata, feeds, sitemap, and robots output.",
    markdown: [
      "---",
      "title: Search-friendly title",
      "description: Page-specific summary used for meta tags and cards.",
      "image: /ogp/page.png",
      "date: 2026-09-30",
      "publish: true",
      "---",
      "",
      "# Search-friendly title",
    ].join("\n"),
  },
  "@riebeckite/plugin-toc": {
    summary: "Builds a table of contents from Markdown headings.",
    markdown: [
      "# Page",
      "",
      "## First section",
      "",
      "### Nested section",
      "",
      "## Second section",
    ].join("\n"),
  },
  "@riebeckite/plugin-properties": {
    summary:
      'Renders selected frontmatter properties near the article when configured with `render: "slot"`.',
    markdown: [
      "---",
      "created: 2026-09-30",
      "modified: 2026-09-30",
      "tags: [riebeckite, demo]",
      "status: active",
      "---",
    ].join("\n"),
  },
  "@riebeckite/plugin-alias": {
    summary:
      "Creates redirects from old Markdown paths declared in frontmatter.",
    markdown: [
      "---",
      "aliases:",
      "  - /old-page/",
      "  - /notes/previous-name/",
      "---",
    ].join("\n"),
  },
  "@riebeckite/plugin-search": {
    summary:
      "Indexes published Markdown pages for client-side search. No special syntax is required; searchable text comes from each page body and metadata.",
    markdown:
      "# Indexed page\n\nThis body text becomes searchable after the site is built.",
  },
  "@riebeckite/plugin-backlinks": {
    summary:
      "Shows pages that link to the current page. Use normal Markdown links or Obsidian wikilinks.",
    markdown:
      "Mention another page with [[guide]] or [the guide](/guide/). The target page can show this page as a backlink.",
  },
  "@riebeckite/plugin-related-posts": {
    summary: "Finds related pages from tags and backlink relationships.",
    markdown: [
      "---",
      "tags: [typescript, static-site]",
      "---",
      "",
      "Link to [[another-note]] to strengthen the relationship.",
    ].join("\n"),
  },
  "@riebeckite/plugin-share": {
    summary:
      "Adds share links to rendered pages. Markdown does not need special syntax; page title and URL are used automatically.",
    markdown: [
      "---",
      "title: Shareable article",
      "---",
      "",
      "# Shareable article",
    ].join("\n"),
  },
  "@riebeckite/plugin-changelog": {
    summary:
      "Surfaces recent or per-note update information from Markdown metadata.",
    markdown: [
      "---",
      "title: Updated article",
      "modified: 2026-09-30",
      "---",
    ].join("\n"),
  },
  "@riebeckite/plugin-webmention": {
    summary:
      "Displays webmentions for the page URL when data is available. Markdown controls the canonical page metadata.",
    markdown: [
      "---",
      "title: Mentionable page",
      "canonical: https://example.com/mentionable-page/",
      "---",
    ].join("\n"),
  },
  "@riebeckite/plugin-recent-posts": {
    summary: "Builds recent-post lists from dated Markdown entries.",
    markdown: [
      "---",
      "title: New post",
      "date: 2026-09-30",
      "publish: true",
      "---",
    ].join("\n"),
  },
  "@riebeckite/plugin-attachment": {
    summary:
      "Enhances links to downloadable assets, including size display when enabled.",
    markdown: "Download the handout: [slides.pdf](/attachments/slides.pdf)",
  },
  "@riebeckite/plugin-pdf": {
    summary: "Embeds linked PDFs with a viewer/fallback UI.",
    markdown: "![Project brief](./attachments/project-brief.pdf)",
  },
  "@riebeckite/plugin-media": {
    summary:
      "Enhances Markdown audio/video embeds with lazy loading and captions.",
    markdown:
      "![Demo video](./media/demo.mp4)\n\n![Episode audio](./media/episode.mp3)",
  },
  "@riebeckite/plugin-responsive-image": {
    summary:
      "Rewrites Markdown image embeds into responsive images with configured widths and formats.",
    markdown: "![A responsive landscape](./images/landscape.jpg)",
  },
  "@riebeckite/plugin-lightbox": {
    summary:
      "Makes image links open in a lightbox when the configured trigger class is present.",
    markdown:
      "[![Open in lightbox](./images/photo.jpg)](./images/photo.jpg){.rr-lightbox-trigger}",
  },
  "@riebeckite/plugin-highlight": {
    summary: "Highlights marked inline text.",
    markdown:
      "This sentence contains ==highlighted text== inside normal Markdown.",
  },
  "@riebeckite/plugin-code-annotations": {
    summary: "Adds callouts/annotations to code fences.",
    markdown: [
      "```ts",
      "const answer = 42 // [!code focus]",
      "console.log(answer)",
      "```",
    ].join("\n"),
  },
  "@riebeckite/plugin-shortcodes": {
    summary: "Expands built-in shortcode syntax inside Markdown.",
    markdown:
      '{{< youtube dQw4w9WgXcQ >}}\n\n{{< figure src="/images/demo.png" caption="Demo image" >}}',
  },
  "@riebeckite/plugin-series": {
    summary: "Groups Markdown pages into a reading series using frontmatter.",
    markdown: [
      "---",
      "series: riebeckite-guide",
      "series_title: Riebeckite Guide",
      "series_order: 2",
      "---",
    ].join("\n"),
  },
  "@riebeckite/plugin-taxonomy": {
    summary:
      "Builds tag/folder taxonomy pages from Markdown metadata and content location.",
    markdown: ["---", "tags: [design, notes]", "---", "", "# Tagged note"].join(
      "\n",
    ),
  },
  "@riebeckite/plugin-autocardlink": {
    summary: "Turns suitable standalone links into rich card links.",
    markdown: "https://example.com/articles/riebeckite-introduction",
  },
  "@riebeckite/plugin-plantuml": {
    summary:
      "A `plantuml` fence is rendered to SVG through the configured PlantUML server.",
    markdown: fence(
      "plantuml",
      ["@startuml", "Alice -> Bob: Hello", "Bob --> Alice: Hi", "@enduml"].join(
        "\n",
      ),
    ),
  },
  "@riebeckite/plugin-discord-embed": {
    summary:
      "Renders Discord-style rich embed metadata from frontmatter or embed blocks.",
    markdown: [
      "---",
      "title: Discord preview",
      "description: A page with rich metadata for card rendering.",
      "image: /images/card.png",
      "---",
    ].join("\n"),
  },
  "@riebeckite/plugin-excalidraw": {
    summary: "Embeds Excalidraw drawings referenced from Markdown.",
    markdown:
      "![[Architecture.excalidraw]]\n\n![Sketch](./drawings/sketch.excalidraw)",
  },
  "@riebeckite/plugin-excalibrain": {
    summary:
      "Builds an Excalibrain-style local graph from links, tags, headings, and inferred relationships.",
    markdown:
      "# Concept\n\nLinks to [[Parent idea]], [[Sibling idea]], and [[Related idea]] become graph relationships.",
  },
  "@riebeckite/plugin-canvas": {
    summary: "Embeds Obsidian Canvas JSON as a rendered canvas/fallback.",
    markdown: '```canvas\n{ "nodes": [], "edges": [] }\n```',
  },
  "@riebeckite/plugin-flashcards": {
    summary: "Turns Q/A style Markdown into flashcards.",
    markdown: [
      "# Flashcards",
      "",
      "Q: What is Riebeckite?",
      "A: A content-first static site framework.",
      "",
      "---",
      "",
      "What does SSG mean?::Static Site Generation",
    ].join("\n"),
  },
  "@riebeckite/plugin-local-graph": {
    summary: "Shows nearby notes based on Markdown links and wikilinks.",
    markdown:
      "# Local graph source\n\nConnect this page to [[guide]], [[examples]], and [[reference/plugins]].",
  },
  "@riebeckite/plugin-hover-preview": {
    summary:
      "Shows previews when hovering internal links generated from Markdown.",
    markdown:
      "Hover this internal link: [Guide](/guide/) or this wikilink: [[guide]].",
  },
  "@riebeckite/plugin-garden-explorer": {
    summary:
      "Adds garden navigation/explorer UI from the content tree. Markdown files and folders become the source data.",
    markdown: fence(
      "text",
      [
        "content/",
        "  notes/",
        "    ideas.md",
        "    projects.md",
        "  reference/",
        "    plugins.md",
      ].join("\n"),
    ),
  },
  "@riebeckite/plugin-ux": {
    summary:
      "Adds reading UX such as progress, back-to-top, scroll spy, and copy buttons. Markdown headings and code blocks provide the anchors.",
    markdown: [
      "## Long section",
      "",
      "```ts",
      "console.log('copy me')",
      "```",
    ].join("\n"),
  },
  "@riebeckite/plugin-daily-notes": {
    summary:
      "Extracts daily-note summaries/snippets from dated Markdown files.",
    markdown: [
      "---",
      "daily-summary: Shipped the plugin reference page.",
      "---",
      "",
      "```daily-snippet",
      "Updated the showcase examples.",
      "```",
    ].join("\n"),
  },
  "@riebeckite/plugin-rename": {
    summary:
      "Creates redirects when Markdown entries declare previous paths or when rename data is available.",
    markdown: [
      "---",
      "previousPaths:",
      "  - /old-slug/",
      "  - /notes/old-title/",
      "---",
    ].join("\n"),
  },
  "@riebeckite/plugin-text-fragment": {
    summary:
      "Adds text-fragment friendly copy/open behavior for selected Markdown text.",
    markdown:
      "Select this sentence in the rendered page and copy a text-fragment link to it.",
  },
  "@riebeckite/plugin-quality": {
    summary:
      "Reports accessibility/content quality diagnostics from rendered Markdown output.",
    markdown:
      "![Missing alt text example](./images/needs-alt.png)\n\nUse headings in order: #, then ##, then ###.",
  },
  "@riebeckite/plugin-deploy": {
    summary:
      "Adds deployment integration for the generated site. Markdown does not need syntax; published pages become deployable output.",
    markdown: [
      "---",
      "publish: true",
      "---",
      "",
      "# This page is included in the deployed site",
    ].join("\n"),
  },
  "@riebeckite/plugin-diagnostics": {
    summary:
      "Reports diagnostics such as missing required frontmatter, orphan pages, and unused assets.",
    markdown: [
      "---",
      "title: Required title",
      "publish: true",
      "---",
      "",
      "Link orphan pages from another note to clear orphan diagnostics.",
    ].join("\n"),
  },
};

function pluginReadmeUrl(slug: string): string {
  return `https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/${slug}/README.md`;
}

function themeReadmeUrl(slug: string): string {
  return `https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/${slug}/README.md`;
}

/**
 * Generates the content pages for a scaffold preset.
 *
 * Localized pages (`index`, `framework/plugins`, `framework/themes`) follow the
 * l10n plugin convention: the default-language page keeps the plain name
 * (`index.md`) while every other language uses the `<base>.<lang>.md` suffix.
 * Presets without l10n emit the index in the site's default language only.
 * Extra pages (`guide`, `examples`, `reference/*`) are English-only and are
 * suffixed with `.en` when English is not the site's default language.
 */
export function localizedContentFiles(
  variables: SiteTemplateVariables,
  preset: ScaffoldPreset,
): readonly SiteTemplateFile[] {
  const defaultLang = defaultLanguageForLocale(variables.locale);
  const files: SiteTemplateFile[] = [];
  const localized = preset.languages.length > 1;

  const pushLocalized = (
    basePath: string,
    build: (language: ScaffoldLanguage) => string,
  ): void => {
    if (!localized) {
      files.push({
        path: `content/${basePath}.md`,
        content: build(defaultLang as ScaffoldLanguage),
      });
      return;
    }
    for (const language of SCAFFOLD_LANGUAGES) {
      const suffix = language === defaultLang ? "" : `.${language}`;
      files.push({
        path: `content/${basePath}${suffix}.md`,
        content: build(language),
      });
    }
  };

  const pushEnglishOnly = (basePath: string, build: () => string): void => {
    const suffix = defaultLang === "en" ? "" : ".en";
    files.push({
      path: `content/${basePath}${suffix}.md`,
      content: build(),
    });
  };

  for (const page of preset.contentPages) {
    if (page === "index") {
      pushLocalized("index", (language) =>
        indexContent(variables, preset, language),
      );
    } else if (page === "framework/plugins") {
      pushLocalized("framework/plugins", (language) =>
        pluginsContent(language),
      );
    } else if (page === "framework/themes") {
      pushLocalized("framework/themes", (language) =>
        themesContent(language, preset),
      );
    } else if (page === "guide") {
      pushEnglishOnly("guide", guideContent);
    } else if (page === "examples") {
      pushLocalized("examples", (language) =>
        examplesContent(preset, language),
      );
    } else if (page === "reference/plugins") {
      pushEnglishOnly("reference/plugins", () =>
        referencePluginsContent(preset, variables),
      );
    } else if (page === "reference/themes") {
      pushEnglishOnly("reference/themes", () => referenceThemesContent(preset));
    }
  }

  if (preset.name === "starter" || preset.name === "showcase") {
    files.push(...knowledgeFixtureFiles(preset));
  }
  if (preset.name === "showcase") {
    files.push(...showcaseAssetFiles());
  }

  return files;
}

type LocalizedText = Record<ScaffoldLanguage, string>;

function read(text: LocalizedText, language: ScaffoldLanguage): string {
  return text[language];
}

function frontmatter(): string {
  return ["---", "publish: true", "---", ""].join("\n");
}

function heading(level: number, text: string): string {
  return `${"#".repeat(level)} ${text}`;
}

function codeBlock(language: string, code: string): string {
  return `\`\`\`${language}\n${code}\n\`\`\`\n`;
}

/** Small connected notes exercise the discovery plugins without duplicating demos. */
function knowledgeFixtureFiles(
  preset: ScaffoldPreset,
): readonly SiteTemplateFile[] {
  const prefix = preset.name === "showcase" ? "demo" : "notes";
  return [
    {
      path: `content/${prefix}/planning.md`,
      content: [
        "---",
        "title: Planning a Markdown site",
        "description: A related note used by the generated discovery examples.",
        "date: 2026-09-30",
        "tags: [riebeckite, project]",
        "status: active",
        "aliases: [/start-here/]",
        "series: publish-a-site",
        "series_title: Publish a site",
        "series_order: 1",
        "publish: true",
        "---",
        "",
        "# Planning a Markdown site",
        "",
        "Start with [[writing]] to see backlinks, related posts, tags, and the series navigation working together.",
      ].join("\n"),
    },
    {
      path: `content/${prefix}/writing.md`,
      content: [
        "---",
        "title: Writing the first note",
        "description: A second connected note for search and related-content examples.",
        "date: 2026-10-01",
        "tags: [riebeckite, project]",
        "status: active",
        "series: publish-a-site",
        "series_title: Publish a site",
        "series_order: 2",
        "publish: true",
        "---",
        "",
        "# Writing the first note",
        "",
        "This note links back to [[planning]]. Search for **Markdown site** or browse the generated tags.",
      ].join("\n"),
    },
  ];
}

/** Text fixtures are intentionally local so a generated showcase has no monorepo dependency. */
function showcaseAssetFiles(): readonly SiteTemplateFile[] {
  return [
    {
      path: "content/images/demo.svg",
      content:
        '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" fill="#315b8c"/><text x="320" y="180" fill="white" font-size="32" text-anchor="middle">Riebeckite showcase</text></svg>\n',
    },
    {
      path: "content/attachments/project-brief.pdf",
      content:
        "%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
    },
    {
      path: "content/drawings/Architecture.excalidraw",
      content:
        '{"type":"excalidraw","version":2,"elements":[],"appState":{"viewBackgroundColor":"#ffffff"},"files":{}}\n',
    },
    {
      path: "content/drawings/site.canvas",
      content:
        '{"nodes":[{"id":"note","type":"text","text":"Note","x":0,"y":0,"width":200,"height":60}],"edges":[]}\n',
    },
  ];
}

// ----- Index ---------------------------------------------------------------

const INDEX = {
  lead: {
    en: "Welcome to your Riebeckite site.",
    ja: "あなたの Riebeckite サイトへようこそ。",
    "zh-CN": "欢迎来到你的 Riebeckite 站点。",
    es: "Bienvenido a tu sitio Riebeckite.",
    de: "Willkommen auf deiner Riebeckite-Seite.",
    fr: "Bienvenue sur votre site Riebeckite.",
    ko: "Riebeckite 사이트에 오신 것을 환영합니다.",
  },
  translatedNote: {
    en: "Every page of this starter is available in seven languages. Switch with the selector below the page title.",
    ja: "このスターターのすべてのページは 7 言語で利用できます。ページタイトル下のセレクターで切り替えられます。",
    "zh-CN":
      "本模板的每个页面均提供七种语言版本，可用页面标题下方的选择器切换。",
    es: "Cada página de este starter está disponible en siete idiomas. Cámbialos con el selector bajo el título.",
    de: "Jede Seite dieses Starters ist in sieben Sprachen verfügbar. Wechsel mit dem Auswahlfeld unter dem Seitentitel.",
    fr: "Chaque page de ce starter est disponible en sept langues. Changez avec le sélecteur sous le titre.",
    ko: "이 스타터의 모든 페이지는 7개 언어로 제공됩니다. 페이지 제목 아래 선택기로 전환하세요.",
  },
  whatHeading: {
    en: "What is Riebeckite?",
    ja: "Riebeckite とは",
    "zh-CN": "什么是 Riebeckite？",
    es: "¿Qué es Riebeckite?",
    de: "Was ist Riebeckite?",
    fr: "Qu'est-ce que Riebeckite ?",
    ko: "Riebeckite란?",
  },
  whatBody: {
    en: "Riebeckite is an extensible, content-first framework that builds fast static sites from plain Markdown — the same notes you keep in Obsidian. The ecosystem includes 50+ plugins and six themes, and this site demos both.",
    ja: "Riebeckite は、プレーンな Markdown（Obsidian で管理しているのと同じノート）から高速な静的サイトを生成する、拡張性のあるコンテンツファーストのフレームワークです。エコシステムには 50 以上のプラグインと 6 つのテーマがあり、このサイトはその両方をデモしています。",
    "zh-CN":
      "Riebeckite 是一个可扩展、内容优先的框架，可从纯 Markdown（即你在 Obsidian 中保存的笔记）构建快速的静态站点。生态包含 50+ 插件与六个主题，本站点同时演示两者。",
    es: "Riebeckite es un framework extensible y orientado al contenido que construye sitios estáticos rápidos desde Markdown simple — las mismas notas que guardas en Obsidian. El ecosistema incluye más de 50 plugins y seis temas; este sitio demuestra ambos.",
    de: "Riebeckite ist ein erweiterbares, inhaltsorientiertes Framework, das schnelle statische Seiten aus einfachem Markdown baut — denselben Notizen, die du in Obsidian führst. Das Ökosystem umfasst 50+ Plugins und sechs Themes; diese Seite demonstriert beides.",
    fr: "Riebeckite est un framework extensible et centré sur le contenu qui construit des sites statiques rapides à partir de Markdown simple — les mêmes notes que vous gardez dans Obsidian. L'écosystème inclut plus de 50 plugins et six thèmes ; ce site en démontre les deux.",
    ko: "Riebeckite는 일반 Markdown(Obsidian에서 관리하는 노트)에서 빠른 정적 사이트를 만드는 확장 가능한 콘텐츠 우선 프레임워크입니다. 생태계에는 50개 이상의 플러그인과 6개 테마가 있으며, 이 사이트가 그 두 가지를 보여줍니다.",
  },
  exploreHeading: {
    en: "Explore",
    ja: "さらに深く",
    "zh-CN": "继续探索",
    es: "Explorar",
    de: "Weiter erkunden",
    fr: "Explorer",
    ko: "더 살펴보기",
  },
  explorePlugins: {
    en: "Plugins — representative packages grouped by capability",
    ja: "プラグイン — 機能別の代表的なパッケージ",
    "zh-CN": "插件 — 按能力分组的代表性包",
    es: "Plugins — paquetes representativos por capacidad",
    de: "Plugins — repräsentative Pakete nach Fähigkeit",
    fr: "Plugins — paquets représentatifs par capacité",
    ko: "플러그인 — 기능별 대표 패키지",
  },
  exploreThemes: {
    en: "Themes — built-in design packages and how to switch",
    ja: "テーマ — 同梱のデザインパッケージと切り替え方",
    "zh-CN": "主题 — 内置设计包与切换方法",
    es: "Temas — paquetes de diseño incluidos y cómo cambiar",
    de: "Themes — mitgelieferte Design-Pakete und wie man wechselt",
    fr: "Thèmes — paquets de design inclus et comment changer",
    ko: "테마 — 내장 디자인 패키지와 전환 방법",
  },
  editHeading: {
    en: "Edit this site",
    ja: "サイトの編集",
    "zh-CN": "编辑本站点",
    es: "Editar este sitio",
    de: "Diese Seite bearbeiten",
    fr: "Éditer ce site",
    ko: "사이트 편집",
  },
  editLead: {
    en: "Content lives in `content/` as plain Markdown. Add a file, give it `publish: true` in the frontmatter, and it appears in the built site.",
    ja: "コンテンツは `content/` にプレーンな Markdown として置きます。ファイルを追加してフロントマターに `publish: true` を書けば、ビルドされたサイトに反映されます。",
    "zh-CN":
      "内容以纯 Markdown 存于 `content/`。新建文件并在 frontmatter 中写入 `publish: true`，它就会出现在构建后的站点中。",
    es: "El contenido vive en `content/` como Markdown simple. Añade un archivo, pon `publish: true` en el frontmatter y aparecerá en el sitio compilado.",
    de: "Inhalte liegen als einfaches Markdown in `content/`. Füge eine Datei hinzu, setze `publish: true` ins Frontmatter, und sie erscheint in der gebauten Seite.",
    fr: "Le contenu vit dans `content/` en Markdown simple. Ajoutez un fichier, donnez-lui `publish: true` dans le frontmatter, et il apparaîtra dans le site construit.",
    ko: "콘텐츠는 `content/`에 일반 Markdown으로 저장됩니다. 파일을 추가하고 프론트매터에 `publish: true`를 쓰면 빌드된 사이트에 나타납니다.",
  },
  editL10n: {
    en: "Localized pages use the `<base>.<lang>.md` convention next to the default file — for example `about.ja.md`. The l10n plugin serves them under `/lang/` paths and links them automatically.",
    ja: "翻訳ページは既定ファイルの隣に `<base>.<lang>.md` の命名規則で置きます（例：`about.ja.md`）。l10n プラグインが `/lang/` パスの配下で配信し、自動的にリンクします。",
    "zh-CN":
      "本地化页面采用默认文件旁的 `<base>.<lang>.md` 命名约定（例如 `about.ja.md`）。l10n 插件会在 `/lang/` 路径下提供服务并自动互链。",
    es: "Las páginas localizadas usan la convención `<base>.<lang>.md` junto al archivo por defecto (p. ej. `about.ja.md`). El plugin l10n las sirve bajo rutas `/lang/` y las enlaza automáticamente.",
    de: "Übersetzte Seiten folgen der Konvention `<base>.<lang>.md` neben der Standarddatei (z. B. `about.ja.md`). Das l10n-Plugin liefert sie unter `/lang/`-Pfaden und verlinkt sie automatisch.",
    fr: "Les pages localisées suivent la convention `<base>.<lang>.md` à côté du fichier par défaut (ex. `about.ja.md`). Le plugin l10n les sert sous des chemins `/lang/` et les relie automatiquement.",
    ko: "번역 페이지는 기본 파일 옆에 `<base>.<lang>.md` 규칙으로 둡니다(예: `about.ja.md`). l10n 플러그인이 `/lang/` 경로로 서빙하며 자동으로 링크합니다.",
  },
} satisfies Record<string, LocalizedText>;

function indexContent(
  variables: SiteTemplateVariables,
  preset: ScaffoldPreset,
  language: ScaffoldLanguage,
): string {
  const title = variables.title;
  return [
    frontmatter(),
    heading(1, title),
    read(INDEX.lead, language),
    read(INDEX.translatedNote, language),
    heading(2, read(INDEX.whatHeading, language)),
    read(INDEX.whatBody, language),
    ...(preset.name === "showcase"
      ? [
          heading(2, read(INDEX.exploreHeading, language)),
          `- [${read(INDEX.explorePlugins, language)}](/framework/plugins)`,
          `- [${read(INDEX.exploreThemes, language)}](/framework/themes)`,
          "- [Working examples](/examples/)",
          "- [Plugin reference](/reference/plugins/)",
        ]
      : preset.name === "starter"
        ? [
            heading(2, read(INDEX.exploreHeading, language)),
            "- [Getting started](/guide/)",
            "- [Example notes](/examples/)",
          ]
        : []),
    heading(2, read(INDEX.editHeading, language)),
    read(INDEX.editLead, language),
    read(INDEX.editL10n, language),
    "",
  ].join("\n");
}

// ----- Themes --------------------------------------------------------------

type ThemeRow = {
  /** Package slug (after `@riebeckite/theme-`) and README directory. */
  readonly slug: string;
  readonly factory: string;
  readonly desc: LocalizedText;
};

type ThemesCopy = {
  readonly title: LocalizedText;
  readonly intro: LocalizedText;
  readonly galleryHeading: LocalizedText;
  readonly switchHeading: LocalizedText;
  readonly switchCurrent: LocalizedText;
  readonly switchStep1: LocalizedText;
  readonly switchStep2: LocalizedText;
  readonly tableHeading: LocalizedText;
  readonly columnTheme: LocalizedText;
  readonly columnDescription: LocalizedText;
  readonly note: LocalizedText;
};

const THEMES_COPY: ThemesCopy = {
  title: {
    en: "Themes",
    ja: "テーマ",
    "zh-CN": "主题",
    es: "Temas",
    de: "Themen",
    fr: "Thèmes",
    ko: "테마",
  },
  intro: {
    en: "A theme changes the whole look and feel of a site — colors, typography, and layout — without touching your content or routes. Riebeckite ships with six themes; switch by installing a package and changing one line.",
    ja: "テーマを変えるだけで、色・文字組み・レイアウトといったサイト全体の見た目が変わります。コンテンツやルートには一切触れる必要はありません。Riebeckite には 6 つのテーマが用意されており、パッケージをインストールして 1 行書き換えるだけで切り替えられます。",
    "zh-CN":
      "主题能整体改变站点的观感——配色、排版与布局——而无需改动你的内容或路由。Riebeckite 内置六个主题，安装一个包、改一行配置即可切换。",
    es: "Un tema cambia toda la apariencia del sitio — colores, tipografía y diseño — sin tocar tu contenido ni tus rutas. Riebeckite incluye seis temas: instala un paquete y cambia una línea.",
    de: "Ein Theme verändert das gesamte Erscheinungsbild einer Seite — Farben, Typografie, Layout — ohne dass du Inhalte oder Routen anfasst. Riebeckite bringt sechs Themes mit; der Wechsel ist eine Paketinstallation plus eine Zeile.",
    fr: "Un thème change tout l'aspect d'un site — couleurs, typographie, mise en page — sans toucher au contenu ni aux routes. Riebeckite fournit six thèmes ; installez un paquet et changez une ligne.",
    ko: "테마를 바꾸면 색상·타이포그래피·레이아웃 등 사이트 전체 분위기가 달라집니다. 콘텐츠나 라우트는 건드릴 필요가 없습니다. Riebeckite는 6개 테마를 제공하며 패키지 설치 후 한 줄만 바꾸면 전환됩니다.",
  },
  galleryHeading: {
    en: "Theme gallery",
    ja: "テーマギャラリー",
    "zh-CN": "主题画廊",
    es: "Galería de temas",
    de: "Theme-Galerie",
    fr: "Galerie des thèmes",
    ko: "테마 갤러리",
  },
  switchHeading: {
    en: "Switching themes",
    ja: "テーマの切り替え",
    "zh-CN": "切换主题",
    es: "Cambiar de tema",
    de: "Theme wechseln",
    fr: "Changer de thème",
    ko: "테마 전환",
  },
  switchCurrent: {
    en: "This starter uses `@riebeckite/theme-default`. To try another theme:",
    ja: "このスターターは `@riebeckite/theme-default` を使っています。別のテーマを試すには：",
    "zh-CN": "本模板使用 `@riebeckite/theme-default`。想尝试其他主题：",
    es: "Este starter usa `@riebeckite/theme-default`. Para probar otro tema:",
    de: "Dieser Starter verwendet `@riebeckite/theme-default`. Um ein anderes Theme zu testen:",
    fr: "Ce starter utilise `@riebeckite/theme-default`. Pour essayer un autre thème :",
    ko: "이 스타터는 `@riebeckite/theme-default`를 사용합니다. 다른 테마를 시도하려면：",
  },
  switchStep1: {
    en: "Install the package:",
    ja: "パッケージをインストール：",
    "zh-CN": "安装该包：",
    es: "Instala el paquete:",
    de: "Installiere das Paket:",
    fr: "Installez le paquet :",
    ko: "패키지를 설치합니다：",
  },
  switchStep2: {
    en: "Point `theme` at the new factory in `riebeckite.config.ts`:",
    ja: "`riebeckite.config.ts` の `theme` を新しいファクトリに変更：",
    "zh-CN": "在 `riebeckite.config.ts` 中将 `theme` 指向新工厂函数：",
    es: "Apunta `theme` al nuevo factory en `riebeckite.config.ts`:",
    de: "Setze `theme` in `riebeckite.config.ts` auf den neuen Factory:",
    fr: "Pointez `theme` vers le nouveau factory dans `riebeckite.config.ts` :",
    ko: "`riebeckite.config.ts`의 `theme`를 새 팩토리로 변경합니다：",
  },
  tableHeading: {
    en: "The bundled themes",
    ja: "同梱テーマ一覧",
    "zh-CN": "内置主题一览",
    es: "Los temas incluidos",
    de: "Die mitgelieferten Themes",
    fr: "Les thèmes inclus",
    ko: "내장 테마 목록",
  },
  columnTheme: {
    en: "Theme",
    ja: "テーマ",
    "zh-CN": "主题",
    es: "Tema",
    de: "Theme",
    fr: "Thème",
    ko: "테마",
  },
  columnDescription: {
    en: "Description",
    ja: "説明",
    "zh-CN": "说明",
    es: "Descripción",
    de: "Beschreibung",
    fr: "Description",
    ko: "설명",
  },
  note: {
    en: "Every theme supports light/dark color modes, typography, and article layouts; see each README for the full option list.",
    ja: "すべてのテーマでライト/ダーク切り替え、文字組み、記事レイアウトをサポートしています。詳しいオプションは各 README を参照してください。",
    "zh-CN": "所有主题都支持明暗配色、排版与文章布局，完整选项请见各 README。",
    es: "Todos los temas admiten modos claro/oscuro, tipografía y diseño de artículo; consulta cada README para la lista completa de opciones.",
    de: "Jedes Theme unterstützt Hell/Dunkel-Modi, Typografie und Artikel-Layouts; die vollständige Optionsliste steht im jeweiligen README.",
    fr: "Chaque thème prend en charge les modes clair/sombre, la typographie et les mises en page d'article ; voir chaque README pour la liste complète des options.",
    ko: "모든 테마가 라이트/다크 모드, 타이포그래피, 아티클 레이아웃을 지원합니다. 전체 옵션은 각 README를 참조하세요.",
  },
};

const THEMES: readonly ThemeRow[] = [
  {
    slug: "default",
    factory: "defaultTheme()",
    desc: {
      en: "The default theme: clean design tokens, light/dark/system color modes, and article layouts.",
      ja: "デフォルトテーマ：クリーンなデザイントークン、ライト/ダーク/システムのカラーモード、記事レイアウト。",
      "zh-CN": "默认主题：简洁的设计令牌、浅色/深色/系统配色与文章布局。",
      es: "El tema por defecto: tokens limpios, modos claro/oscuro/sistema y distintos diseños de artículo.",
      de: "Das Standard-Theme: klare Design-Tokens, Licht/Dunkel/System-Modi und Artikel-Layouts.",
      fr: "Le thème par défaut : tokens épurés, modes clair/sombre/système et mises en page d'article.",
      ko: "기본 테마: 깔끔한 디자인 토큰, 라이트/다크/시스템 컬러 모드, 아티클 레이아웃.",
    },
  },
  {
    slug: "minimal",
    factory: "minimalTheme()",
    desc: {
      en: "A quiet, typography-first theme.",
      ja: "文字組みを重視した静かなテーマ。",
      "zh-CN": "以排版为先的简洁主题。",
      es: "Un tema sobrio, centrado en la tipografía.",
      de: "Ein ruhiges, typografieorientiertes Theme.",
      fr: "Un thème sobre, axé sur la typographie.",
      ko: "타이포그래피 우선의 차분한 테마.",
    },
  },
  {
    slug: "sakura",
    factory: "sakuraTheme()",
    desc: {
      en: "A soft pink palette with warm accents.",
      ja: "やわらかいピンクと温かみのあるアクセントのテーマ。",
      "zh-CN": "柔和的粉色配色与温暖点缀。",
      es: "Una paleta rosa suave con acentos cálidos.",
      de: "Eine weiche rosa Palette mit warmen Akzenten.",
      fr: "Une palette rose douce aux accents chaleureux.",
      ko: "부드러운 핑크 팔레트와 따뜻한 액센트.",
    },
  },
  {
    slug: "gruvbox",
    factory: "gruvboxTheme()",
    desc: {
      en: "A warm, retro palette inspired by Gruvbox.",
      ja: "Gruvbox 風の温かみのあるレトロパレット。",
      "zh-CN": "受 Gruvbox 启发的温暖复古配色。",
      es: "Una paleta retro cálida inspirada en Gruvbox.",
      de: "Eine warme, von Gruvbox inspirierte Retro-Palette.",
      fr: "Une palette rétro chaleureuse inspirée de Gruvbox.",
      ko: "Gruvbox에서 영감을 받은 따뜻한 레트로 팔레트.",
    },
  },
  {
    slug: "tokyonight",
    factory: "tokyonightTheme()",
    desc: {
      en: "A modern night palette with an optional neon accent.",
      ja: "ネオンオプション付きのモダンなナイトパレット。",
      "zh-CN": "现代夜间配色，可选霓虹点缀。",
      es: "Una paleta nocturna moderna con acento neón opcional.",
      de: "Eine moderne Night-Palette mit optionalem Neon-Akzent.",
      fr: "Une palette nocturne moderne avec accent néon optionnel.",
      ko: "네온 액센트를 선택할 수 있는 모던한 나이트 팔레트.",
    },
  },
  {
    slug: "rerurate",
    factory: "rerurateTheme()",
    desc: {
      en: "The author's personal design language.",
      ja: "作者自身のデザインをテーマにしたテーマ。",
      "zh-CN": "作者个人的设计风格主题。",
      es: "El lenguaje de diseño personal del autor.",
      de: "Die persönliche Designsprache des Autors.",
      fr: "Le langage de design personnel de l'auteur.",
      ko: "저자의 개인 디자인 언어 테마.",
    },
  },
];

const THEME_LABELS: Readonly<Record<string, string>> = {
  default: "Default",
  minimal: "Minimal",
  sakura: "Sakura",
  gruvbox: "Gruvbox",
  tokyonight: "Tokyo Night",
  rerurate: "Rerurate",
};

function themeGalleryFence(description: (theme: ThemeRow) => string): string {
  const items: string[] = ["columns: 3", "items:"];
  for (const theme of THEMES) {
    const label = THEME_LABELS[theme.slug] ?? theme.slug;
    items.push(`  - title: ${JSON.stringify(label)}`);
    items.push(`    description: ${JSON.stringify(description(theme))}`);
    items.push(`    meta: ${JSON.stringify(theme.factory)}`);
    items.push(`    href: ${JSON.stringify(themeReadmeUrl(theme.slug))}`);
  }
  return fence("gallery", items.join("\n"));
}

function themesContent(
  language: ScaffoldLanguage,
  preset: ScaffoldPreset,
): string {
  const copy = THEMES_COPY;
  const lines: string[] = [frontmatter()];
  lines.push(heading(1, read(copy.title, language)), "");
  lines.push(read(copy.intro, language), "");
  if (hasPlugin(preset, GALLERY_PACKAGE)) {
    lines.push(heading(2, read(copy.galleryHeading, language)), "");
    lines.push(
      themeGalleryFence((theme) => read(theme.desc, language)),
      "",
    );
  }
  lines.push(heading(2, read(copy.switchHeading, language)), "");
  lines.push(read(copy.switchCurrent, language), "");
  lines.push(read(copy.switchStep1, language), "");
  lines.push(codeBlock("sh", "npm install @riebeckite/theme-sakura"));
  lines.push(read(copy.switchStep2, language), "");
  lines.push(
    codeBlock(
      "ts",
      [
        'import { sakuraTheme } from "@riebeckite/theme-sakura";',
        "",
        "export default defineConfig({",
        "  theme: sakuraTheme(),",
        "});",
      ].join("\n"),
    ),
  );
  lines.push(heading(2, read(copy.tableHeading, language)), "");
  lines.push(
    `| ${read(copy.columnTheme, language)} | ${read(copy.columnDescription, language)} |`,
  );
  lines.push("| --- | --- |");
  for (const theme of THEMES) {
    const packageName = `@riebeckite/theme-${theme.slug}`;
    lines.push(
      `| [\`${packageName}\`](${themeReadmeUrl(theme.slug)}) · \`${theme.factory}\` | ${read(theme.desc, language)} |`,
    );
  }
  lines.push("");
  lines.push(heading(2, read(copy.note, language)), "");
  lines.push("");
  lines.push(`[Riebeckite themes on GitHub](${THEMES_INDEX_URL})`, "");
  lines.push("");
  return lines.join("\n");
}

// ----- Plugins -------------------------------------------------------------

type PluginRow = {
  /** Package slug (after `@riebeckite/plugin-`) and README directory. */
  readonly slug: string;
  readonly desc: LocalizedText;
};

type PluginCategory = {
  readonly title: LocalizedText;
  readonly summary: LocalizedText;
  readonly plugins: readonly PluginRow[];
};

type PluginsCopy = {
  readonly title: LocalizedText;
  readonly intro: LocalizedText;
  readonly installHeading: LocalizedText;
  readonly installStep1: LocalizedText;
  readonly installStep2: LocalizedText;
  readonly fullList: LocalizedText;
  readonly fullListLabel: LocalizedText;
  readonly columnPlugin: LocalizedText;
  readonly columnDescription: LocalizedText;
};

const PLUGINS_COPY: PluginsCopy = {
  title: {
    en: "Plugins",
    ja: "プラグイン",
    "zh-CN": "插件",
    es: "Plugins",
    de: "Plugins",
    fr: "Plugins",
    ko: "플러그인",
  },
  intro: {
    en: "Riebeckite's power comes from its plugin ecosystem — over fifty packages that extend Markdown, rendering, search, SEO, and more. Below are representative examples grouped by capability; every entry links to its full README.",
    ja: "Riebeckite の力はプラグインエコシステムにあります——50 以上のパッケージが Markdown・描画・検索・SEO などを拡張します。ここでは代表的なプラグインを機能別に紹介します。各項目のリンクから詳細な README を参照できます。",
    "zh-CN":
      "Riebeckite 的强大来自其插件生态——五十多个扩展 Markdown、渲染、搜索、SEO 等的包。下面按能力分组展示代表性示例，每一项都链接到完整 README。",
    es: "El poder de Riebeckite viene de su ecosistema de plugins — más de cincuenta paquetes que extienden Markdown, renderizado, búsqueda, SEO y más. Aquí tienes ejemplos representativos agrupados por capacidad; cada uno enlaza a su README completo.",
    de: "Riebeckites Stärke kommt aus seinem Plugin-Ökosystem — über fünfzig Pakete, die Markdown, Rendering, Suche, SEO und mehr erweitern. Hier finden sich repräsentative Beispiele nach Fähigkeit gruppiert; jeder Eintrag verlinkt auf sein volles README.",
    fr: "La puissance de Riebeckite vient de son écosystème de plugins — plus de cinquante paquets qui étendent Markdown, le rendu, la recherche, le SEO et plus encore. Voici des exemples représentatifs groupés par capacité ; chaque entrée renvoie vers son README complet.",
    ko: "Riebeckite의 힘은 플러그인 생태계에 있습니다 — Markdown·렌더링·검색·SEO 등을 확장하는 50개 이상의 패키지. 아래는 기능별로 대표적인 예를 소개하며, 각 항목은 전체 README로 연결됩니다.",
  },
  installHeading: {
    en: "Adding a plugin",
    ja: "プラグインの追加",
    "zh-CN": "添加插件",
    es: "Añadir un plugin",
    de: "Ein Plugin hinzufügen",
    fr: "Ajouter un plugin",
    ko: "플러그인 추가",
  },
  installStep1: {
    en: "Install the package:",
    ja: "パッケージをインストール：",
    "zh-CN": "安装该包：",
    es: "Instala el paquete:",
    de: "Installiere das Paket:",
    fr: "Installez le paquet :",
    ko: "패키지를 설치합니다：",
  },
  installStep2: {
    en: "Register it in the `plugins` array of `riebeckite.config.ts`:",
    ja: "`riebeckite.config.ts` の `plugins` 配列に登録：",
    "zh-CN": "在 `riebeckite.config.ts` 的 `plugins` 数组中注册：",
    es: "Regístralo en el array `plugins` de `riebeckite.config.ts`:",
    de: "Registriere es im `plugins`-Array der `riebeckite.config.ts`:",
    fr: "Enregistrez-le dans le tableau `plugins` de `riebeckite.config.ts` :",
    ko: "`riebeckite.config.ts`의 `plugins` 배열에 등록합니다：",
  },
  fullList: {
    en: "The complete plugin index lives in the repository:",
    ja: "全プラグインの一覧はリポジトリにあります：",
    "zh-CN": "完整的插件索引位于仓库中：",
    es: "El índice completo de plugins vive en el repositorio:",
    de: "Der vollständige Plugin-Index liegt im Repository:",
    fr: "L'index complet des plugins se trouve dans le dépôt :",
    ko: "전체 플러그인 목록은 저장소에 있습니다：",
  },
  fullListLabel: {
    en: "Riebeckite plugins on GitHub",
    ja: "GitHub の Riebeckite プラグイン",
    "zh-CN": "GitHub 上的 Riebeckite 插件",
    es: "Plugins de Riebeckite en GitHub",
    de: "Riebeckite-Plugins auf GitHub",
    fr: "Plugins Riebeckite sur GitHub",
    ko: "GitHub의 Riebeckite 플러그인",
  },
  columnPlugin: {
    en: "Plugin",
    ja: "プラグイン",
    "zh-CN": "插件",
    es: "Plugin",
    de: "Plugin",
    fr: "Plugin",
    ko: "플러그인",
  },
  columnDescription: {
    en: "What it does",
    ja: "できること",
    "zh-CN": "作用",
    es: "Qué hace",
    de: "Funktion",
    fr: "Rôle",
    ko: "기능",
  },
};

const PLUGIN_CATEGORIES: readonly PluginCategory[] = [
  {
    title: {
      en: "Markdown and notes",
      ja: "マークダウンとノート",
      "zh-CN": "Markdown 与笔记",
      es: "Markdown y notas",
      de: "Markdown und Notizen",
      fr: "Markdown et notes",
      ko: "마크다운과 노트",
    },
    summary: {
      en: "Everyday note-taking tuned for Obsidian vaults.",
      ja: "Obsidian ボールト向けの日常ノート機能。",
      "zh-CN": "为 Obsidian 库打造的日常笔记功能。",
      es: "Toma de notas diaria afinada para bóvedas Obsidian.",
      de: "Alltägliche Notizfunktionen, optimiert für Obsidian-Vaults.",
      fr: "Prise de notes quotidienne pensée pour les coffres Obsidian.",
      ko: "Obsidian 볼트에 맞춘 일상 노트 기능.",
    },
    plugins: [
      {
        slug: "obsidian-markdown",
        desc: {
          en: "Obsidian-flavored Markdown: wikilinks, embeds, callouts, and tags.",
          ja: "Obsidian 風マークダウン：ウィキリンク・埋め込み・コールアウト・タグ。",
          "zh-CN": "Obsidian 风格 Markdown：双链、嵌入、标注与标签。",
          es: "Markdown estilo Obsidian: wikilinks, embeds, callouts y etiquetas.",
          de: "Obsidian-Markdown: Wikilinks, Einbettungen, Callouts und Tags.",
          fr: "Markdown façon Obsidian : wikilinks, embeds, callouts et tags.",
          ko: "Obsidian 스타일 마크다운: 위키링크, 임베드, 콜아웃, 태그.",
        },
      },
      {
        slug: "attachment",
        desc: {
          en: "Renders attached files and embeds assets via wikilinks.",
          ja: "ウィキリンクによるファイル添付とアセットの埋め込み表示。",
          "zh-CN": "通过双链渲染附件并嵌入资源。",
          es: "Renderiza archivos adjuntos e incrusta assets con wikilinks.",
          de: "Rendert Dateianhänge und bettet Assets per Wikilinks ein.",
          fr: "Rend les fichiers joints et embarque les ressources via wikilinks.",
          ko: "위키링크로 첨부 파일을 렌더링하고 자산을 임베드.",
        },
      },
      {
        slug: "media",
        desc: {
          en: "Audio and video embeds from plain links.",
          ja: "プレーンなリンクから音声・動画を埋め込み。",
          "zh-CN": "从普通链接嵌入音频和视频。",
          es: "Incrusta audio y vídeo desde enlaces simples.",
          de: "Audio- und Video-Embeds aus einfachen Links.",
          fr: "Embeds audio et vidéo depuis de simples liens.",
          ko: "일반 링크에서 오디오·비디오 임베드.",
        },
      },
    ],
  },
  {
    title: {
      en: "Diagrams and presentation",
      ja: "図とプレゼンテーション",
      "zh-CN": "图表与演示",
      es: "Diagramas y presentación",
      de: "Diagramme und Präsentation",
      fr: "Diagrammes et présentation",
      ko: "다이어그램과 프레젠테이션",
    },
    summary: {
      en: "Turn fenced code blocks into diagrams, charts, and slide decks.",
      ja: "フェンスコードブロックを図やチャート、スライドに変換。",
      "zh-CN": "将围栏代码块变成图表与幻灯片。",
      es: "Convierte bloques de código en diagramas, gráficas y diapositivas.",
      de: "Verwandle fenced Code-Blöcke in Diagramme, Charts und Folien.",
      fr: "Transformez des blocs de code en diagrammes, graphiques et diapositives.",
      ko: "fenced 코드 블록을 다이어그램·차트·슬라이드로 전환.",
    },
    plugins: [
      {
        slug: "mermaid",
        desc: {
          en: "Mermaid diagrams from fenced code blocks.",
          ja: "フェンスコードブロックから Mermaid 図を描画。",
          "zh-CN": "从围栏代码块渲染 Mermaid 图表。",
          es: "Diagramas Mermaid desde bloques de código delimitados.",
          de: "Mermaid-Diagramme aus fenced Code-Blöcken.",
          fr: "Diagrammes Mermaid depuis des blocs de code délimités.",
          ko: "fenced 코드 블록에서 Mermaid 다이어그램 렌더링.",
        },
      },
      {
        slug: "graphviz",
        desc: {
          en: "DOT / Graphviz diagrams.",
          ja: "DOT / Graphviz 図。",
          "zh-CN": "DOT / Graphviz 图表。",
          es: "Diagramas DOT / Graphviz.",
          de: "DOT / Graphviz-Diagramme.",
          fr: "Diagrammes DOT / Graphviz.",
          ko: "DOT / Graphviz 다이어그램.",
        },
      },
      {
        slug: "d2",
        desc: {
          en: "Diagrams in the D2 language.",
          ja: "D2 言語によるダイアグラム。",
          "zh-CN": "使用 D2 语言绘制图表。",
          es: "Diagramas en lenguaje D2.",
          de: "Diagramme in der Sprache D2.",
          fr: "Diagrammes en langage D2.",
          ko: "D2 언어 다이어그램.",
        },
      },
      {
        slug: "excalidraw",
        desc: {
          en: "Renders Excalidraw sketch files.",
          ja: "Excalidraw スケッチファイルを描画。",
          "zh-CN": "渲染 Excalidraw 草图文件。",
          es: "Renderiza bocetos de Excalidraw.",
          de: "Rendert Excalidraw-Skizzen.",
          fr: "Rend les croquis Excalidraw.",
          ko: "Excalidraw 스케치 파일 렌더링.",
        },
      },
      {
        slug: "gallery",
        desc: {
          en: "Card grids for theme or project showcases.",
          ja: "テーマやプロジェクトの紹介向けカードグリッド。",
          "zh-CN": "用于主题或项目展示的卡片网格。",
          es: "Cuadrículas de tarjetas para escaparates de temas o proyectos.",
          de: "Kartenraster für Theme- oder Projekt-Showcases.",
          fr: "Grilles de cartes pour vitrines de thèmes ou de projets.",
          ko: "테마·프로젝트 소개용 카드 그리드.",
        },
      },
    ],
  },
  {
    title: {
      en: "Code and reading experience",
      ja: "コードと読書体験",
      "zh-CN": "代码与阅读体验",
      es: "Código y experiencia de lectura",
      de: "Code und Leseerlebnis",
      fr: "Code et expérience de lecture",
      ko: "코드와 읽기 경험",
    },
    summary: {
      en: "Better code blocks and a comfortable reading experience.",
      ja: "読みやすいコードブロックと快適な読書体験。",
      "zh-CN": "更好的代码块与舒适的阅读体验。",
      es: "Mejores bloques de código y una lectura cómoda.",
      de: "Bessere Code-Blöcke und ein angenehmes Leseerlebnis.",
      fr: "De meilleurs blocs de code et une lecture confortable.",
      ko: "더 나은 코드 블록과 편안한 읽기 경험.",
    },
    plugins: [
      {
        slug: "code-enhance",
        desc: {
          en: "Syntax highlighting, line numbers, and code toolbars.",
          ja: "シンタックスハイライト・行番号・コードツールバー。",
          "zh-CN": "语法高亮、行号与代码工具栏。",
          es: "Resaltado de sintaxis, números de línea y barras de código.",
          de: "Syntax-Highlighting, Zeilennummern und Code-Symbolleisten.",
          fr: "Coloration syntaxique, numéros de ligne et barres de code.",
          ko: "구문 강조, 줄 번호, 코드 도구 모음.",
        },
      },
      {
        slug: "code-tabs",
        desc: {
          en: "Accessible tabbed code blocks.",
          ja: "アクセシブルなタブ式コードブロック。",
          "zh-CN": "无障碍的标签式代码块。",
          es: "Bloques de código con pestañas accesibles.",
          de: "Barrierefreie Code-Blöcke mit Tabs.",
          fr: "Blocs de code à onglets accessibles.",
          ko: "접근성 있는 탭식 코드 블록.",
        },
      },
      {
        slug: "toc",
        desc: {
          en: "A scroll-aware table of contents.",
          ja: "スクロール追従の目次。",
          "zh-CN": "随滚动高亮的目录。",
          es: "Una tabla de contenidos que sigue el scroll.",
          de: "Ein scrollgesteuertes Inhaltsverzeichnis.",
          fr: "Une table des matières qui suit le défilement.",
          ko: "스크롤을 따라가는 목차.",
        },
      },
      {
        slug: "backlinks",
        desc: {
          en: "Lists notes that link to the current one.",
          ja: "現在のノートを参照するノートを一覧表示。",
          "zh-CN": "列出链接到当前笔记的笔记。",
          es: "Lista las notas que enlazan con la actual.",
          de: "Listet Notizen, die auf die aktuelle verlinken.",
          fr: "Liste les notes qui pointent vers la note courante.",
          ko: "현재 노트를 링크한 노트 목록.",
        },
      },
    ],
  },
  {
    title: {
      en: "Search and navigation",
      ja: "検索とナビゲーション",
      "zh-CN": "搜索与导航",
      es: "Búsqueda y navegación",
      de: "Suche und Navigation",
      fr: "Recherche et navigation",
      ko: "검색과 탐색",
    },
    summary: {
      en: "Find and move through your notes quickly.",
      ja: "ノートをすばやく探して移動する。",
      "zh-CN": "快速查找并在笔记之间穿梭。",
      es: "Encuentra y recorre tus notas rápidamente.",
      de: "Notizen schnell finden und durch sie navigieren.",
      fr: "Retrouvez et parcourez vos notes rapidement.",
      ko: "노트를 빠르게 찾고 이동하기.",
    },
    plugins: [
      {
        slug: "search",
        desc: {
          en: "Client-side full-text search with a Ctrl+K modal.",
          ja: "Ctrl+K モーダル付きのクライアント側全文検索。",
          "zh-CN": "带 Ctrl+K 弹窗的客户端全文搜索。",
          es: "Búsqueda de texto completo en el cliente con modal Ctrl+K.",
          de: "Clientseitige Volltextsuche mit Ctrl+K-Modal.",
          fr: "Recherche plein texte côté client avec modal Ctrl+K.",
          ko: "Ctrl+K 모달이 있는 클라이언트 전체 텍스트 검색.",
        },
      },
      {
        slug: "garden-explorer",
        desc: {
          en: "An interactive graph and search explorer.",
          ja: "ノートのグラフと検索を探索するインタラクティブビュー。",
          "zh-CN": "交互式图谱与搜索探索器。",
          es: "Un explorador interactivo de grafo y búsqueda.",
          de: "Ein interaktiver Graph- und Such-Explorer.",
          fr: "Un explorateur interactif de graphe et de recherche.",
          ko: "노트 그래프와 검색을 탐색하는 대화형 뷰.",
        },
      },
      {
        slug: "local-graph",
        desc: {
          en: "A link graph around the current note.",
          ja: "ノート周辺のリンクグラフ。",
          "zh-CN": "当前笔记周边的链接图谱。",
          es: "Un grafo de enlaces alrededor de la nota actual.",
          de: "Ein Link-Graph rund um die aktuelle Notiz.",
          fr: "Un graphe de liens autour de la note courante.",
          ko: "현재 노트 주변의 링크 그래프.",
        },
      },
      {
        slug: "permalink",
        desc: {
          en: "Stable, configurable permalinks.",
          ja: "安定したカスタマイズ可能なパーマリンク。",
          "zh-CN": "稳定、可配置的永久链接。",
          es: "Permalinks estables y configurables.",
          de: "Stabile, konfigurierbare Permalinks.",
          fr: "Permaliens stables et configurables.",
          ko: "안정적이고 설정 가능한 고유 주소.",
        },
      },
    ],
  },
  {
    title: {
      en: "Publishing and SEO",
      ja: "公開と SEO",
      "zh-CN": "发布与 SEO",
      es: "Publicación y SEO",
      de: "Veröffentlichung und SEO",
      fr: "Publication et SEO",
      ko: "배포와 SEO",
    },
    summary: {
      en: "Ship a site that search engines and readers both understand.",
      ja: "検索エンジンにも読者にも伝わるサイトを公開する。",
      "zh-CN": "发布搜索引擎和读者都能理解的站点。",
      es: "Publica un sitio que buscan buscadores y lectores por igual.",
      de: "Veröffentliche eine Seite, die Suchmaschinen und Leser gleichermaßen verstehen.",
      fr: "Publiez un site que moteurs de recherche et lecteurs comprennent.",
      ko: "검색 엔진과 독자 모두가 이해하는 사이트를 배포.",
    },
    plugins: [
      {
        slug: "seo",
        desc: {
          en: "SEO metadata, sitemaps, RSS/Atom/JSON feeds, and robots.txt.",
          ja: "SEO メタデータ・サイトマップ・RSS/Atom/JSON フィード・robots.txt。",
          "zh-CN": "SEO 元数据、站点地图、RSS/Atom/JSON 订阅与 robots.txt。",
          es: "Metadatos SEO, sitemaps, feeds RSS/Atom/JSON y robots.txt.",
          de: "SEO-Metadaten, Sitemaps, RSS/Atom/JSON-Feeds und robots.txt.",
          fr: "Métadonnées SEO, sitemaps, flux RSS/Atom/JSON et robots.txt.",
          ko: "SEO 메타데이터·사이트맵·RSS/Atom/JSON 피드·robots.txt.",
        },
      },
      {
        slug: "l10n",
        desc: {
          en: "Localized URLs, a language switcher, and hreflang metadata — this site runs on it.",
          ja: "ローカライズ済み URL・言語スイッチャー・hreflang メタデータ——このサイトもこれで動いています。",
          "zh-CN":
            "本地化 URL、语言切换器与 hreflang 元数据——本站就运行在它之上。",
          es: "URLs localizadas, selector de idioma y metadatos hreflang — este sitio se ejecuta sobre él.",
          de: "Lokalisierte URLs, Sprachumschalter und hreflang-Metadaten — diese Seite läuft darauf.",
          fr: "URLs localisées, sélecteur de langue et métadonnées hreflang — ce site repose dessus.",
          ko: "로컬라이즈된 URL·언어 전환 UI·hreflang 메타데이터 — 이 사이트가 동작하는 기반입니다.",
        },
      },
      {
        slug: "rich-embed",
        desc: {
          en: "Build-time rich media cards for external links.",
          ja: "外部リンクのビルド時リッチメディアカード。",
          "zh-CN": "外部链接的构建时富媒体卡片。",
          es: "Tarjetas multimedia en build para enlaces externos.",
          de: "Rich-Media-Karten für externe Links zur Build-Zeit.",
          fr: "Cartes média construites à la compilation pour les liens externes.",
          ko: "외부 링크의 빌드 시점 리치 미디어 카드.",
        },
      },
      {
        slug: "deploy",
        desc: {
          en: "Static deployment output for hosting services.",
          ja: "ホスティングサービス向けの静的デプロイ出力。",
          "zh-CN": "面向托管服务的静态部署产物。",
          es: "Salida de despliegue estático para servicios de hosting.",
          de: "Statische Deployment-Ausgabe für Hosting-Dienste.",
          fr: "Sortie de déploiement statique pour les services d'hébergement.",
          ko: "호스팅 서비스용 정적 배포 산출물.",
        },
      },
    ],
  },
  {
    title: {
      en: "Content and developer experience",
      ja: "コンテンツと開発体験",
      "zh-CN": "内容与开发者体验",
      es: "Contenido y experiencia de desarrollo",
      de: "Content und Developer Experience",
      fr: "Contenu et expérience développeur",
      ko: "콘텐츠와 개발자 경험",
    },
    summary: {
      en: "Query, organize, and keep your content healthy.",
      ja: "コンテンツを検索・整理し、健全に保つ。",
      "zh-CN": "查询、整理并保持内容健康。",
      es: "Consulta, organiza y mantén sano tu contenido.",
      de: "Content abfragen, organisieren und gesund halten.",
      fr: "Requêter, organiser et garder votre contenu sain.",
      ko: "콘텐츠를 조회·정리하고 건강하게 유지.",
    },
    plugins: [
      {
        slug: "dataview",
        desc: {
          en: "Build-time queries over your notes.",
          ja: "ノートに対するビルド時クエリ。",
          "zh-CN": "对笔记的构建时查询。",
          es: "Consultas en build sobre tus notas.",
          de: "Build-Zeit-Abfragen über deine Notizen.",
          fr: "Requêtes temps de build sur vos notes.",
          ko: "노트에 대한 빌드 시점 조회.",
        },
      },
      {
        slug: "kanban",
        desc: {
          en: "Obsidian-style Kanban boards from Markdown lists.",
          ja: "Markdown リストから Obsidian スタイルのカンバンボードを作成。",
          "zh-CN": "从 Markdown 列表创建 Obsidian 风格看板。",
          es: "Tableros Kanban estilo Obsidian desde listas Markdown.",
          de: "Obsidian-ähnliche Kanban-Boards aus Markdown-Listen.",
          fr: "Tableaux Kanban façon Obsidian depuis des listes Markdown.",
          ko: "Markdown 목록에서 Obsidian 스타일 칸반 보드 생성.",
        },
      },
      {
        slug: "responsive-image",
        desc: {
          en: "Responsive images with lazy loading.",
          ja: "レスポンシブ画像と遅延読み込み。",
          "zh-CN": "响应式图片与懒加载。",
          es: "Imágenes responsive con carga diferida.",
          de: "Responsive Bilder mit Lazy Loading.",
          fr: "Images responsives avec chargement différé.",
          ko: "지연 로딩 지원 반응형 이미지.",
        },
      },
      {
        slug: "quality",
        desc: {
          en: "Static quality and accessibility checks.",
          ja: "静的品質・アクセシビリティ検査。",
          "zh-CN": "静态质量与可访问性检查。",
          es: "Inspección estática de calidad y accesibilidad.",
          de: "Statische Qualitäts- und Barrierefreiheitsprüfung.",
          fr: "Contrôle statique de qualité et d'accessibilité.",
          ko: "정적 품질·접근성 검사.",
        },
      },
    ],
  },
];

function pluginsContent(language: ScaffoldLanguage): string {
  const copy = PLUGINS_COPY;
  const categories = PLUGIN_CATEGORIES;
  const lines: string[] = [frontmatter()];
  lines.push(heading(1, read(copy.title, language)), "");
  lines.push(read(copy.intro, language), "");
  lines.push(heading(2, read(copy.installHeading, language)), "");
  lines.push(read(copy.installStep1, language), "");
  lines.push(codeBlock("sh", "npm install @riebeckite/plugin-mermaid"));
  lines.push(read(copy.installStep2, language), "");
  lines.push(
    codeBlock(
      "ts",
      [
        'import { defineConfig } from "@riebeckite/core";',
        'import { l10n } from "@riebeckite/plugin-l10n";',
        'import { mermaid } from "@riebeckite/plugin-mermaid";',
        'import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";',
        "",
        "export default defineConfig({",
        "  // ...",
        "  plugins: [obsidianMarkdown(), l10n({ ... }), mermaid()],",
        "});",
      ].join("\n"),
    ),
  );
  lines.push(read(copy.fullList, language), "");
  lines.push(
    `[${read(copy.fullListLabel, language)}](${PLUGIN_INDEX_URL})`,
    "",
  );

  for (const category of categories) {
    lines.push(heading(2, read(category.title, language)), "");
    lines.push(read(category.summary, language), "");
    lines.push(
      `| ${read(copy.columnPlugin, language)} | ${read(copy.columnDescription, language)} |`,
    );
    lines.push("| --- | --- |");
    for (const plugin of category.plugins) {
      const packageName = `@riebeckite/plugin-${plugin.slug}`;
      lines.push(
        `| [\`${packageName}\`](${pluginReadmeUrl(plugin.slug)}) | ${read(plugin.desc, language)} |`,
      );
    }
    lines.push("");
  }

  lines.push("");
  lines.push(
    `Riebeckite: [documentation](${HELPERS.en}) · [日本語ドキュメント](${HELPERS.ja})`,
    "",
  );
  lines.push("");
  return lines.join("\n");
}

// ----- English-only extra pages --------------------------------------------

function guideContent(): string {
  return [
    frontmatter(),
    heading(1, "Getting started"),
    "",
    "This site was generated from a Riebeckite scaffold preset. Everything",
    "you see lives in this repository, ready to edit.",
    "",
    heading(2, "Add a page"),
    "",
    "Drop a Markdown file into `content/` with `publish: true` in its",
    "frontmatter and it appears in the built site:",
    "",
    codeBlock(
      "md",
      ["---", "publish: true", "---", "", "# Hello", "", "Body text..."].join(
        "\n",
      ),
    ),
    "",
    heading(2, "Run the site"),
    "",
    codeBlock(
      "sh",
      [
        "npm install",
        "npm exec riebeckite dev",
        "npm exec riebeckite build",
      ].join("\n"),
    ),
    "",
    heading(2, "Localize a page"),
    "",
    "Add a translated file next to the default one using the",
    "`<base>.<lang>.md` convention (`about.ja.md`, `about.en.md`). With the",
    "l10n plugin enabled, translations are served under `/lang/` paths and",
    "linked by the language switcher.",
    "",
    heading(2, "Extend"),
    "",
    "Plugins and themes are registered in `riebeckite.config.ts`. Install a",
    "package, import its factory, and add it to the `plugins` array or point",
    "`theme` at a new theme factory.",
    "",
  ].join("\n");
}

/** A short two-language label falling back to English for other languages. */
type SummaryText = { readonly en: string; readonly ja?: string };

function readSummary(text: SummaryText, language: ScaffoldLanguage): string {
  return language === "ja" ? (text.ja ?? text.en) : text.en;
}

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

function examplesContent(
  preset: ScaffoldPreset,
  language: ScaffoldLanguage,
): string {
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

function referencePluginsContent(
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

function referenceThemesContent(preset: ScaffoldPreset): string {
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
