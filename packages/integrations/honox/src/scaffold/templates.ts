import { defaultSsrExternals } from "../vite_plugin.js";
import { localizedContentFiles } from "./localized-content.js";
import {
  defaultLanguageForLocale,
  type ScaffoldPreset,
  type ScaffoldPresetName,
} from "./presets.js";

export type SiteTemplateVariables = {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly baseUrl: string;
  readonly locale: string;
};

export type SiteTemplateFile = {
  readonly path: string;
  readonly content: string;
};

export function siteTemplateFiles(
  preset: ScaffoldPreset,
  variables: SiteTemplateVariables,
): readonly SiteTemplateFile[] {
  return [
    { path: "package.json", content: packageJson(preset, variables) },
    {
      path: "riebeckite.config.ts",
      content: riebeckiteConfig(preset, variables),
    },
    { path: "vite.config.ts", content: viteConfig() },
    { path: "tsconfig.json", content: tsconfig() },
    { path: ".gitignore", content: gitignore() },
    { path: "README.md", content: readme(preset, variables) },
    ...localizedContentFiles(variables, preset),
    ...appFiles(preset),
  ];
}

const APP_FILE_LABELS = [
  "server",
  "client",
  "config",
  "content",
  "paths",
  "global",
  "style",
  "renderer",
  "index",
  "slug",
  "header",
  "article",
] as const satisfies readonly string[];

function appFiles(preset: ScaffoldPreset): readonly SiteTemplateFile[] {
  const builders: Readonly<Record<string, () => string>> = {
    server: () => server(),
    client: () => client(),
    config: () => appConfig(),
    content: () => appContent(),
    paths: () => paths(),
    global: () => globalDeclarations(),
    style: () => style(preset),
    renderer: () => renderer(preset),
    index: () => indexRoute(preset),
    slug: () => slugRoute(),
    header: () => siteHeader(),
    article: () => article(),
  };
  const generated = new Map<string, string>();
  for (const key of APP_FILE_LABELS) {
    if (preset.appFiles.includes(key)) {
      generated.set(key, builders[key]());
    }
  }
  const has = (key: string): boolean => generated.has(key);
  const get = (key: string): string => generated.get(key) as string;
  return [
    ...(has("server")
      ? [{ path: "app/server.ts", content: get("server") }]
      : []),
    ...(has("client")
      ? [{ path: "app/client.ts", content: get("client") }]
      : []),
    ...(has("config")
      ? [{ path: "app/config.ts", content: get("config") }]
      : []),
    ...(has("content")
      ? [{ path: "app/content.ts", content: get("content") }]
      : []),
    ...(has("paths")
      ? [{ path: "app/constants/paths.ts", content: get("paths") }]
      : []),
    ...(has("global")
      ? [{ path: "app/global.d.ts", content: get("global") }]
      : []),
    ...(has("style") ? [{ path: "app/style.css", content: get("style") }] : []),
    ...(has("renderer")
      ? [{ path: "app/routes/_renderer.tsx", content: get("renderer") }]
      : []),
    ...(has("index")
      ? [{ path: "app/routes/index.tsx", content: get("index") }]
      : []),
    ...(has("slug")
      ? [{ path: "app/routes/[slug{.+}].tsx", content: get("slug") }]
      : []),
    ...(has("header")
      ? [{ path: "app/components/site-header.tsx", content: get("header") }]
      : []),
    ...(has("article")
      ? [{ path: "app/components/article.tsx", content: get("article") }]
      : []),
  ];
}

const RIEBECKITE_VERSION = "^0.0.3";

function packageJson(
  preset: ScaffoldPreset,
  variables: SiteTemplateVariables,
): string {
  const dependencies: Record<string, string> = {
    "@riebeckite/core": RIEBECKITE_VERSION,
    "@riebeckite/honox": RIEBECKITE_VERSION,
    hono: "^4.12.25",
    honox: "0.1.56",
  };
  for (const plugin of preset.plugins) {
    dependencies[plugin.package] = RIEBECKITE_VERSION;
  }
  if (preset.theme) {
    dependencies[preset.theme.package] = RIEBECKITE_VERSION;
  }

  return `${JSON.stringify(
    {
      name: variables.name,
      private: true,
      version: "0.0.0",
      type: "module",
      scripts: {
        dev: "riebeckite dev",
        build: "riebeckite build",
        check: "riebeckite check",
        doctor: "riebeckite doctor",
        inspect: "riebeckite inspect",
      },
      dependencies,
      devDependencies: {
        "@hono/vite-build": "^1.11.1",
        "@riebeckite/cli": RIEBECKITE_VERSION,
        "@types/node": "^24.5.2",
        typescript: "^5.0.0",
        vite: "^8.0.9",
      },
    },
    null,
    2,
  )}\n`;
}

function riebeckiteConfig(
  preset: ScaffoldPreset,
  variables: SiteTemplateVariables,
): string {
  const { title, description, baseUrl, locale } = variables;
  const lines: string[] = ['import { defineConfig } from "@riebeckite/core";'];
  for (const plugin of preset.plugins) {
    lines.push(`import { ${plugin.factory} } from "${plugin.package}";`);
  }
  if (preset.theme) {
    lines.push(
      `import { ${preset.theme.factory} } from "${preset.theme.package}";`,
    );
  }
  lines.push("");
  lines.push("export default defineConfig({");
  lines.push("  site: {");
  lines.push(`    title: ${JSON.stringify(title)},`);
  lines.push(`    description: ${JSON.stringify(description)},`);
  lines.push(`    baseUrl: ${JSON.stringify(baseUrl)},`);
  lines.push(`    locale: ${JSON.stringify(locale)},`);
  lines.push("  },");
  lines.push("  content: {");
  lines.push('    directory: "content",');
  lines.push("  },");
  if (preset.theme) {
    const theme = preset.theme;
    lines.push(
      `  theme: ${theme.options ? `${theme.factory}(${theme.options})` : `${theme.factory}()`},`,
    );
  }
  lines.push("  plugins: [");
  for (const plugin of preset.plugins) {
    lines.push(`    ${pluginExpression(plugin, preset, variables)},`);
  }
  lines.push("  ],");
  lines.push("});");
  return `${lines.join("\n")}\n`;
}

function pluginExpression(
  plugin: ScaffoldPreset["plugins"][number],
  preset: ScaffoldPreset,
  variables: SiteTemplateVariables,
): string {
  if (plugin.package === "@riebeckite/plugin-l10n") {
    const defaultLang = defaultLanguageForLocale(variables.locale);
    return `l10n({ defaultLang: ${JSON.stringify(defaultLang)}, languages: ${JSON.stringify(preset.languages)} })`;
  }
  return plugin.options
    ? `${plugin.factory}(${plugin.options})`
    : `${plugin.factory}()`;
}

function viteConfig(): string {
  const ssrExternals = [...defaultSsrExternals]
    .map((name) => `          "${name}",`)
    .join("\n");
  return `import path from "node:path";
import { fileURLToPath } from "node:url";
import build from "@hono/vite-build/node";
import {
  riebeckite,
  riebeckiteSsg,
  riebeckiteSsgExtensionMap,
} from "@riebeckite/honox";
import honox from "honox/vite";
import { defineConfig } from "vite";

const appRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [
    honox({
      client: { input: ["/app/client.ts", "/app/style.css"] },
    }),
    riebeckite({ appRoot }),
    build(),
    riebeckiteSsg({
      entry: path.join(appRoot, "app/server.ts"),
      extensionMap: riebeckiteSsgExtensionMap(),
    }),
  ],
  environments: {
    ssr: {
      resolve: {
        external: [
${ssrExternals}
        ],
      },
    },
  },
});
`;
}

function tsconfig(): string {
  return `${JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        module: "ESNext",
        moduleResolution: "Bundler",
        lib: ["ES2022", "DOM", "DOM.Iterable"],
        jsx: "react-jsx",
        jsxImportSource: "hono/jsx",
        types: ["node", "vite/client"],
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        resolveJsonModule: true,
        skipLibCheck: true,
      },
      include: [
        "app/**/*.ts",
        "app/**/*.tsx",
        "riebeckite.config.ts",
        "vite.config.ts",
      ],
    },
    null,
    2,
  )}\n`;
}

function gitignore(): string {
  return ["node_modules/", "dist/", ".riebeckite/", ""].join("\n");
}

const REPO = "https://github.com/Rerurate514/riebeckite";

const README_INTRO: Readonly<
  Record<ScaffoldPresetName, { readonly en: string; readonly ja: string }>
> = {
  empty: {
    en: "A blank Riebeckite application shell — no theme, no plugins, no components, and no content. Everything is yours to add.",
    ja: "空の Riebeckite アプリケーションシェルです。テーマもプラグインもコンポーネントもコンテンツもなく、すべてを自由に追加できます。",
  },
  minimal: {
    en: "The smallest useful Riebeckite site: Obsidian Markdown, the minimal theme, and a single page.",
    ja: "最小限で実用的な Riebeckite サイトです。Obsidian マークダウン・minimal テーマ・1 ページ構成。",
  },
  starter: {
    en: "The default Riebeckite starter: Obsidian Markdown, a color-mode toggle, and seven languages.",
    ja: "Riebeckite の既定スターターです。Obsidian マークダウン・カラーモード切替・7 言語対応。",
  },
  rich: {
    en: "A showcasing starter: publishing and reading plugins plus guided ecosystem tour pages in seven languages.",
    ja: "紹介を目的としたスターターです。公開・読書体験のプラグインと、7 言語のエコシステム紹介ページ付き。",
  },
  full: {
    en: "A ready-to-use blog preset: discovery, media, and reading plugins plus a getting-started guide.",
    ja: "そのまま使えるブログ向けプリセットです。検索・メディア・読書体験のプラグインと入門ガイド付き。",
  },
  max: {
    en: "Diagram, chart, and knowledge plugins on top of full, with showcase example pages.",
    ja: "full に図解・チャート・ナレッジ系プラグインを加えた構成で、お試し用サンプルページ付き。",
  },
  ultra: {
    en: "The complete plugin catalog with plugin and theme reference pages.",
    ja: "全プラグインを有効化した最上位構成。プラグイン/テーマのリファレンスページ付き。",
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
  },
};

function readme(
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
    lines.push(`- **${words.languages}**: ${languagesLabel(preset, words)}`);
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
  }
  lines.push(`## ${words.commands}`, "");
  lines.push(
    "```sh",
    "pnpm install",
    "pnpm exec riebeckite check",
    "pnpm exec riebeckite dev",
    "pnpm exec riebeckite build",
    "```",
    "",
  );
  if (preset.readme === "rich") {
    lines.push(`## ${words.localization}`, "");
    lines.push(words.localizationBody, "");
    lines.push(`## ${words.extending}`, "");
    lines.push(words.extendingBody, "");
    lines.push(
      `- Docs: [English](${REPO}/blob/main/docs/en/README.md)`,
      `  · [日本語](${REPO}/blob/main/docs/ja/README.md)`,
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
    lines.push(`- **${words.languages}**: ${languagesLabel(preset, words)}`);
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
  }
  lines.push(`## ${words.commands}`, "");
  lines.push(
    "```sh",
    "pnpm install",
    "pnpm exec riebeckite check",
    "pnpm exec riebeckite dev",
    "pnpm exec riebeckite build",
    "```",
    "",
  );
  if (preset.readme === "rich") {
    lines.push(`## ${words.localization}`, "");
    lines.push(words.localizationBody, "");
    lines.push(`## ${words.extending}`, "");
    lines.push(words.extendingBody, "");
    lines.push(
      `- ドキュメント: [English](${REPO}/blob/main/docs/en/README.md)`,
      `  · [日本語](${REPO}/blob/main/docs/ja/README.md)`,
      "",
    );
  }
  return lines.join("\n");
}

function languagesLabel(
  preset: ScaffoldPreset,
  words: Record<string, string>,
): string {
  if (preset.languages.length === 0) return words.none;
  if (preset.languages.length === 1)
    return `${preset.languages[0]} (${words.single})`;
  return preset.languages.join(", ");
}

function pagesLabel(preset: ScaffoldPreset): string | null {
  if (preset.contentPages.length === 0) return null;
  return preset.contentPages.map((page) => `/${page}`).join(", ");
}

function server(): string {
  return `import { mountRiebeckiteEndpoints } from "@riebeckite/honox/server";
import { createApp } from "honox/server";
import { config } from "./config";
import { content } from "./content";

const app = createApp({
  init: (app) => {
    mountRiebeckiteEndpoints(app, { config, content });
  },
});

export default app;
`;
}

function client(): string {
  return `import { initRiebeckiteClient } from "virtual:riebeckite/client";
import { createClient } from "honox/client";

createClient();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPage, { once: true });
} else {
  initPage();
}

function initPage() {
  initRiebeckiteClient();
}
`;
}

function appConfig(): string {
  return `import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveConfigModule } from "@riebeckite/core";
import * as rawConfigModule from "../riebeckite.config";

const appRoot =
  process.env.RIEBECKITE_APP_ROOT ??
  fileURLToPath(new URL("../", import.meta.url));
const resolvedConfig = resolveConfigModule(rawConfigModule);

export const config = {
  ...resolvedConfig,
  content: {
    ...resolvedConfig.content,
    directory: path.resolve(appRoot, resolvedConfig.content.directory),
  },
};
`;
}

function appContent(): string {
  return `import { ContentManager } from "@riebeckite/core";
import { config } from "./config";
import { CONTENT_DIR } from "./constants/paths";

export const content = new ContentManager(
  CONTENT_DIR,
  config.content.exclude,
  {
    config,
    plugins: config.plugins,
  },
);
`;
}

function paths(): string {
  return `import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../config";

const appRoot =
  process.env.RIEBECKITE_APP_ROOT ??
  fileURLToPath(new URL("../../", import.meta.url));

export const CONTENT_DIR = path.resolve(appRoot, config.content.directory);
export const ASSETS_ROOT = "public/";
`;
}

function globalDeclarations(): string {
  return `import type { PluginHeadTag } from "@riebeckite/core";

declare module "virtual:riebeckite/client" {
  export function initRiebeckiteClient(): void;
}

declare module "hono" {
  interface Env {
    Variables: {
      headTags?: readonly PluginHeadTag[];
      htmlLanguage?: string;
    };
    Bindings: Record<string, never>;
  }
}
`;
}

function style(preset: ScaffoldPreset): string {
  const imports: string[] = [];
  if (preset.plugins.length > 0) {
    imports.push('@import "./.riebeckite/plugin-styles.css";');
  }
  if (preset.theme) {
    imports.push('@import "./.riebeckite/theme-styles.css";');
  }
  const blocks: string[] = [
    "",
    "body {",
    "  margin: 0;",
    "  font-family: system-ui, sans-serif;",
    "}",
    "",
  ];
  if (preset.appFiles.includes("header")) {
    blocks.push(
      ".site-header {",
      "  display: flex;",
      "  align-items: center;",
      "  justify-content: space-between;",
      "  gap: 1rem;",
      "  padding: 1rem;",
      "  border-bottom: 1px solid #d1d5db;",
      "}",
      "",
      ".site-header__home {",
      "  color: #111827;",
      "  font-weight: 700;",
      "  text-decoration: none;",
      "}",
      "",
    );
  }
  if (preset.appFiles.includes("article")) {
    blocks.push(
      ".site-article {",
      "  display: block;",
      "  max-width: 48rem;",
      "  padding: 2rem 1rem;",
      "  margin: 0 auto;",
      "}",
      "",
    );
  }
  if (!preset.theme) {
    blocks.push(
      ".riebeckite-empty {",
      "  max-width: 48rem;",
      "  padding: 4rem 1rem;",
      "  margin: 0 auto;",
      "}",
      "",
    );
  }
  return [...imports, ...blocks].join("\n");
}

function siteHeader(): string {
  return `import { ColorModeToggle } from "@riebeckite/plugin-color-mode";
import { config } from "../config";

export function SiteHeader() {
  return (
    <header class="site-header">
      <a href="/" class="site-header__home">
        {config.site.title}
      </a>
      <ColorModeToggle />
    </header>
  );
}
`;
}

function article(): string {
  return `import type { PostContent } from "@riebeckite/core";
import { Article, ArticleContent, ArticleLayout } from "@riebeckite/honox/ui";

export function SiteArticle({
  post,
  afterMeta,
}: {
  post: PostContent;
  afterMeta?: string;
}) {
  return (
    <Article class="site-article">
      <ArticleLayout>
        <ArticleContent>
          {afterMeta ? (
            <div
              class="site-article__after-meta"
              dangerouslySetInnerHTML={{ __html: afterMeta }}
            />
          ) : null}
          <div dangerouslySetInnerHTML={{ __html: post.html ?? "" }} />
        </ArticleContent>
      </ArticleLayout>
    </Article>
  );
}
`;
}

function renderer(preset: ScaffoldPreset): string {
  if (!preset.theme) return bareRenderer();
  const hasHeader = preset.appFiles.includes("header");
  const hasColorMode = preset.plugins.some(
    (plugin) => plugin.package === "@riebeckite/plugin-color-mode",
  );

  return `import type { PluginHeadTag } from "@riebeckite/core";
import { jsxRenderer } from "hono/jsx-renderer";
import { Link, Script } from "honox/server";
${hasColorMode ? `import { ColorModeScript } from "@riebeckite/plugin-color-mode";\n` : ""}${hasHeader ? `import { SiteHeader } from "../components/site-header";\n` : ""}import { config } from "../config";

function themeAttributes() {
  const { theme } = config;

  return {
    ...theme.attributes,
    "data-theme": theme.colorMode === "system" ? undefined : theme.colorMode,
    "data-theme-name": theme.name,
    "data-typography": theme.typography,
    "data-article-layout": theme.articleLayout,
  };
}

export default jsxRenderer(({ children }, c) => {
  const headTags: readonly PluginHeadTag[] = c.get("headTags") ?? [];

  return (
    <html
      lang={c.get("htmlLanguage") ?? config.site.locale}
      {...themeAttributes()}
    >
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{config.site.title}</title>
${hasColorMode ? `        <ColorModeScript />\n` : ""}        <Link href="/app/style.css" rel="stylesheet" />
        {headTags.map(renderHeadTag)}
        <Script src="/app/client.ts" async />
      </head>
      <body class="riebeckite-page">
${hasHeader ? `        <SiteHeader />\n` : ""}        {children}
      </body>
    </html>
  );
});

function renderHeadTag(tag: PluginHeadTag, index: number) {
  const key = \`\${tag.tag}-\${index}\`;
  if (tag.tag === "meta") return <meta {...tag.attrs} key={key} />;
  if (tag.tag === "link") return <link {...tag.attrs} key={key} />;
  return (
    <script
      {...tag.attrs}
      key={key}
      dangerouslySetInnerHTML={
        tag.children ? { __html: tag.children } : undefined
      }
    />
  );
}
`;
}

function bareRenderer(): string {
  return `import { jsxRenderer } from "hono/jsx-renderer";
import { Link, Script } from "honox/server";
import { config } from "../config";

export default jsxRenderer(({ children }, c) => (
  <html lang={c.get("htmlLanguage") ?? config.site.locale}>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>{config.site.title}</title>
      <Link href="/app/style.css" rel="stylesheet" />
      <Script src="/app/client.ts" async />
    </head>
    <body class="riebeckite-page">{children}</body>
  </html>
));
`;
}

function indexRoute(preset: ScaffoldPreset): string {
  if (!preset.appFiles.includes("article")) return staticIndexRoute();
  return `import { isPublished } from "@riebeckite/core";
import { createRoute } from "honox/factory";
import { SiteArticle } from "../components/article";
import { config } from "../config";
import { content } from "../content";

export default createRoute(async (c) => {
  const manifest = await content.getManifest();
  const indexEntry = manifest.bySlug.get("index");
  if (indexEntry && indexEntry.permalink !== "/") {
    return c.redirect(indexEntry.permalink, 308);
  }

  const post = await content.getProcessedContent("index");
  if (!isPublished(config, post.frontmatter)) {
    return c.notFound();
  }

  if (indexEntry) {
    c.set("htmlLanguage", indexEntry.publicLocation.metadata?.["l10n.lang"]);
    c.set("headTags", indexEntry.headTags ?? []);
  }

  return c.render(
    <SiteArticle
      post={post}
      afterMeta={indexEntry?.bodySlots?.["article.after-meta"]}
    />,
  );
});
`;
}

function staticIndexRoute(): string {
  return `import { createRoute } from "honox/factory";
import { config } from "../config";

export default createRoute((c) =>
  c.render(
    <main class="riebeckite-empty">
      <h1>{config.site.title}</h1>
      <p>This is a blank Riebeckite site. Add Markdown files under content/ to get started.</p>
    </main>,
  ),
);
`;
}

function slugRoute(): string {
  return `import { isPublished } from "@riebeckite/core";
import {
  contentRouteSsgParams,
  resolveContentRoute,
} from "@riebeckite/honox/server";
import { createRoute } from "honox/factory";
import { SiteArticle } from "../components/article";
import { config } from "../config";
import { content } from "../content";

export default createRoute(
  contentRouteSsgParams("/:slug{.+}", async () => {
    const manifest = await content.getManifest();
    return manifest.entries
      .filter((entry) => isPublished(config, entry.frontmatter))
      .filter((entry) => entry.permalink !== "/")
      .map((entry) => ({ slug: entry.permalink.replace(/^\\/+/, "") }));
  }),
  async (c) => {
    const requestedSlug = c.req.param("slug");
    if (!requestedSlug) return c.notFound();
    if (/\\.[a-zA-Z0-9]+$/.test(requestedSlug)) return c.notFound();

    const manifest = await content.getManifest();
    const route = resolveContentRoute(manifest, c.req.path);
    if (!route) return c.notFound();
    if (route.kind === "redirect")
      return c.redirect(route.location, route.status);

    const post = await content.getProcessedContent(route.entry.slug);
    if (!isPublished(config, post.frontmatter)) {
      return c.notFound();
    }

    c.set("htmlLanguage", route.entry.publicLocation.metadata?.["l10n.lang"]);
    c.set("headTags", route.entry.headTags ?? []);

    return c.render(
      <SiteArticle
        post={post}
        afterMeta={route.entry.bodySlots?.["article.after-meta"]}
      />,
    );
  },
);
`;
}
