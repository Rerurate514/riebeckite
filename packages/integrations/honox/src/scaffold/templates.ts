import fs from "node:fs";
import { defaultSsrExternals } from "../vite_plugin.js";
import {
  appConfig,
  appContent,
  article,
  client,
  globalDeclarations,
  indexRoute,
  paths,
  renderer,
  server,
  siteHeader,
  slugRoute,
  style,
} from "./app-templates.js";
import { localizedContentFiles } from "./localized-content.js";
import {
  defaultLanguageForLocale,
  type ScaffoldOptionContext,
  type ScaffoldOptions,
  type ScaffoldOptionValue,
  type ScaffoldPreset,
  type ScaffoldPresetName,
} from "./presets.js";
import { RIEBECKITE_VERSION } from "./version.js";

export type SiteTemplateVariables = {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly baseUrl: string;
  readonly locale: string;
};

export type SiteTemplateFile = {
  readonly path: string;
  readonly content: string | Uint8Array;
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
    { path: "public/favicon.ico", content: readPackageAsset("favicon.ico") },
    {
      path: "public/riebeckite-logo.png",
      content: readPackageAsset("riebeckite-logo.png"),
    },
    ...localizedContentFiles(variables, preset),
    ...appFiles(preset),
  ];
}

function readPackageAsset(fileName: string): Uint8Array {
  const candidates = [
    new URL(`../../assets/${fileName}`, import.meta.url),
    new URL(`../../../assets/${fileName}`, import.meta.url),
    new URL(`../assets/${fileName}`, import.meta.url),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return fs.readFileSync(candidate);
  }
  throw new Error(`Missing Riebeckite scaffold asset: ${fileName}`);
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

/**
 * `starter` includes practical configuration and `showcase` renders the full
 * option surface. Lightweight presets deliberately keep depth 0.
 */
const OPTION_DEPTH: Readonly<Record<ScaffoldPresetName, number>> = {
  empty: 0,
  minimal: 0,
  starter: 2,
  showcase: 3,
};

function optionContext(
  preset: ScaffoldPreset,
  variables: SiteTemplateVariables,
): ScaffoldOptionContext {
  return {
    variables,
    languages: preset.languages,
    depth: OPTION_DEPTH[preset.name],
  };
}

function renderOptionValue(
  value: ScaffoldOptionValue,
  context: ScaffoldOptionContext,
): string {
  return typeof value === "function" ? value(context) : value;
}

/**
 * Resolve a plugin's options literal for the preset's depth, or `null` when
 * the plugin takes no options at that depth (and should be called bare).
 */
export function renderOptions(
  options: ScaffoldOptions | undefined,
  context: ScaffoldOptionContext,
): string | null {
  if (options === undefined) return null;
  if (typeof options === "string") return options;
  if (typeof options === "function") return options(context);
  const fields = Object.entries(options)
    .filter(([, field]) => field.depth <= context.depth)
    .map(
      ([key, field]) => `${key}: ${renderOptionValue(field.value, context)}`,
    );
  return fields.length === 0 ? null : `{ ${fields.join(", ")} }`;
}

function pluginExpression(
  plugin: ScaffoldPreset["plugins"][number],
  preset: ScaffoldPreset,
  variables: SiteTemplateVariables,
): string {
  const options = renderOptions(
    plugin.options,
    optionContext(preset, variables),
  );
  return options === null
    ? `${plugin.factory}()`
    : `${plugin.factory}(${options})`;
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
  return [
    "node_modules/",
    "dist/",
    ".riebeckite/",
    "app/.riebeckite/",
    "",
  ].join("\n");
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
    en: "Recommended for most sites: a practical Markdown garden with search, discovery, and reading essentials.",
    ja: "大半のサイトにおすすめの構成です。検索・発見・閲覧に必要な機能を備えた実用的な Markdown サイトを作れます。",
  },
  showcase: {
    en: "Explore the complete Riebeckite ecosystem with rendered examples, reference pages, and local fixtures.",
    ja: "描画例・リファレンスページ・ローカルのフィクスチャで、Riebeckite のエコシステム全体を確認できる構成です。",
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
      "`riebeckite.config.ts` already registers every plugin below with its full option set — the file doubles as the settings reference. Every option is documented in the plugin's package README.",
    factory: "Factory",
    options: "Options",
    emDash: "—",
    demoPages: "Try the demos",
    demoPagesBody:
      "The generated site ships content pages that exercise these features:",
    copyDemos: "Copy-paste demos",
    copyDemosBody:
      "Paste any of these snippets into a Markdown file under `content/` and run `pnpm exec riebeckite dev`. Each one renders through a plugin this preset registers.",
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
      "`riebeckite.config.ts` には、以下の全プラグインがあらかじめ全オプション付きで登録されています。このファイル自体を設定リファレンスとして利用できます。各オプションの詳しい説明はプラグインパッケージの README を参照してください。",
    factory: "ファクトリ",
    options: "オプション",
    emDash: "—",
    demoPages: "デモを試す",
    demoPagesBody:
      "生成されたサイトには、各機能を体験できるコンテンツページが含まれています:",
    copyDemos: "コピーして使えるデモ",
    copyDemosBody:
      "以下のスニペットを `content/` 配下の Markdown ファイルに貼り付けて `pnpm exec riebeckite dev` を実行してください。それぞれ、このプリセットが登録しているプラグインでレンダリングされます。",
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
    if (preset.readme === "rich") {
      lines.push(...configurationReferenceLines(preset, variables, words));
    }
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
    lines.push(...demoPagesLines(preset, variables, words, "en"));
    lines.push(...copyPasteDemoLines(preset, words, "en"));
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
    if (preset.readme === "rich") {
      lines.push(...configurationReferenceLines(preset, variables, words));
    }
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
    lines.push(...demoPagesLines(preset, variables, words, "ja"));
    lines.push(...copyPasteDemoLines(preset, words, "ja"));
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

export type ReadmeDemo = {
  readonly title: { readonly en: string; readonly ja: string };
  readonly intro: { readonly en: string; readonly ja: string };
  readonly markdown: string;
};

export const README_DEMOS: Readonly<Record<string, ReadmeDemo>> = {
  "@riebeckite/plugin-obsidian-markdown/callout": {
    title: { en: "Callouts", ja: "コールアウト" },
    intro: {
      en: "A block quote with a `[!type]` marker becomes a styled callout panel.",
      ja: "`[!type]` マーカー付きブロック引用をスタイル付きパネルに変換します。",
    },
    markdown: [
      "> [!tip] Try it",
      "> A callout is a block quote with a `[!type]` marker. `[!info]`,",
      "> `[!warning]`, and `[!question]` render the same way.",
    ].join("\n"),
  },
  "@riebeckite/plugin-obsidian-markdown/wikilinks": {
    title: { en: "Wikilinks and embeds", ja: "ウィキリンクと埋め込み" },
    intro: {
      en: "`[[...]]` links and `![[...]]` embeds resolve to real permalinks from the content manifest.",
      ja: "`[[...]]` リンクと `![[...]]` 埋め込みは、コンテンツマニフェストから実際のパーマリンクへ解決されます。",
    },
    markdown:
      "Read the [[guide]] and [[index]] pages. `![[index]]` embeds the note inline.",
  },
  "@riebeckite/plugin-code-enhance": {
    title: { en: "Code with a toolbar", ja: "ツールバー付きコード" },
    intro: {
      en: "Code fences get line numbers, a filename bar, line highlighting, and a copy button.",
      ja: "コードフェンスに行番号・ファイル名バー・行ハイライト・コピーボタンが付きます。",
    },
    markdown: fence(
      "ts",
      [
        "// Syntax highlighting, line numbers, and a copy button",
        "export function hello(name: string): string {",
        '  return "Hello, " + name + "!";',
        "}",
      ].join("\n"),
    ),
  },
  "@riebeckite/plugin-code-tabs": {
    title: { en: "Code tabs", ja: "タブ切り替えコード" },
    intro: {
      en: 'Adjacent `tab="..."` fences become one tabbed group; `syncTabs: true` keeps the same label in sync across groups.',
      ja: '隣り合う `tab="..."` フェンスがタブグループになります。`syncTabs: true` でページ内の同じラベルを同期できます。',
    },
    markdown: [
      fence('ts tab="React"', 'const greeting = "Hello from React";'),
      fence('js tab="Vanilla"', 'console.log("Hello from JavaScript");'),
    ].join("\n"),
  },
  "@riebeckite/plugin-mermaid": {
    title: { en: "Mermaid", ja: "Mermaid" },
    intro: {
      en: "A `mermaid` fence becomes a rendered diagram at build time.",
      ja: "`mermaid` フェンスはビルド時にレンダリングされた図になります。",
    },
    markdown: fence(
      "mermaid",
      [
        "flowchart LR",
        "  A[Note] --> B{Published?}",
        "  B -->|yes| C[Site]",
        "  B -->|no| D[Draft]",
      ].join("\n"),
    ),
  },
  "@riebeckite/plugin-d2": {
    title: { en: "D2", ja: "D2" },
    intro: {
      en: "A `d2` fence is compiled into an SVG diagram.",
      ja: "`d2` フェンスが SVG 図にコンパイルされます。",
    },
    markdown: fence("d2", "site: Riebeckite\n  content -> build -> deploy"),
  },
  "@riebeckite/plugin-graphviz": {
    title: { en: "Graphviz / DOT", ja: "Graphviz / DOT" },
    intro: {
      en: "A `dot` fence is rendered with a configurable engine (here `dot`).",
      ja: "`dot` フェンスが指定のエンジン（ここでは `dot`）でレンダリングされます。",
    },
    markdown: fence(
      "dot",
      "digraph G {\n  notes -> pages;\n  pages -> html;\n}",
    ),
  },
  "@riebeckite/plugin-chartjs": {
    title: { en: "Chart.js", ja: "Chart.js" },
    intro: {
      en: "A `chart` JSON fence renders with Chart.js; a caption comes from the block `title`.",
      ja: "`chart` JSON フェンスが Chart.js で描画されます。キャプションはブロックの `title` から取られます。",
    },
    markdown: fence(
      "chart",
      `{
  "type": "bar",
  "data": {
    "labels": ["Mon", "Tue", "Wed"],
    "datasets": [{ "label": "Visits", "data": [12, 19, 8] }]
  }
}`,
    ),
  },
  "@riebeckite/plugin-vega-lite": {
    title: { en: "Vega-Lite", ja: "Vega-Lite" },
    intro: {
      en: "A `vega-lite` JSON specification becomes a Vega chart.",
      ja: "`vega-lite` の JSON 仕様が Vega チャートになります。",
    },
    markdown: fence(
      "vega-lite",
      `{
  "title": "Revenue",
  "data": {
    "values": [
      { "category": "A", "value": 28 },
      { "category": "B", "value": 55 }
    ]
  },
  "mark": "bar",
  "encoding": {
    "x": { "field": "category", "type": "nominal" },
    "y": { "field": "value", "type": "quantitative" }
  }
}`,
    ),
  },
  "@riebeckite/plugin-wavedrom": {
    title: { en: "WaveDrom", ja: "WaveDrom" },
    intro: {
      en: "A `wavedrom` JSON fence becomes a digital timing diagram.",
      ja: "`wavedrom` JSON フェンスがデジタルタイミング図になります。",
    },
    markdown: fence(
      "wavedrom",
      `{
  "signal": [
    { "name": "clk", "wave": "p......" },
    { "name": "bus", "wave": "x.34.5x", "data": "head body tail" }
  ]
}`,
    ),
  },
  "@riebeckite/plugin-markmap": {
    title: { en: "Markmap", ja: "Markmap" },
    intro: {
      en: "A `markmap` fence turns its heading outline into an interactive mind map.",
      ja: "`markmap` フェンスの見出し構成がインタラクティブなマインドマップになります。",
    },
    markdown: fence(
      "markmap",
      [
        "# Project",
        "",
        "## Design",
        "",
        "### Notation",
        "### Rendering",
        "",
        "## Delivery",
      ].join("\n"),
    ),
  },
  "@riebeckite/plugin-map": {
    title: { en: "Maps", ja: "地図" },
    intro: {
      en: "A `map` fence embeds an OpenStreetMap: a static fallback (coordinates and links) first, upgraded to an interactive map when JavaScript is available.",
      ja: "`map` フェンスが OpenStreetMap を埋め込みます。まず静的なフォールバック（座標とリンク）を表示し、JavaScript がある場合はインタラクティブな地図に拡張します。",
    },
    markdown: fence(
      "map",
      [
        "center: 35.6812, 139.7671",
        "zoom: 13",
        "label: Tokyo Station",
        "markers:",
        "  - 35.6812, 139.7671 | Tokyo Station",
        "  - 35.6586, 139.7454 | Tokyo Tower",
      ].join("\n"),
    ),
  },
  "@riebeckite/plugin-marp": {
    title: { en: "Marp slides", ja: "Marp スライド" },
    intro: {
      en: "A `marp` fence renders slides, separated by `---`.",
      ja: "`marp` フェンスがスライドとして描画されます。スライドは `---` で区切ります。",
    },
    markdown: fence(
      'marp title="Intro deck"',
      ["# First slide", "", "- a bullet", "", "---", "", "# Second slide"].join(
        "\n",
      ),
    ),
  },
  "@riebeckite/plugin-qr-code": {
    title: { en: "QR codes", ja: "QR コード" },
    intro: {
      en: "A `qr` fence becomes an inline SVG QR code, encoded entirely at build time.",
      ja: "`qr` フェンスがインライン SVG の QR コードになります（ビルド時に全てエンコードされます）。",
    },
    markdown: fence("qr", "# caption: Project page\nhttps://example.com/"),
  },
  "@riebeckite/plugin-rich-embed": {
    title: { en: "Rich embeds", ja: "リッチ埋め込み" },
    intro: {
      en: "An `embed` fence turns a URL into a YouTube, Vimeo, Spotify, CodePen, or Gist embed.",
      ja: "`embed` フェンスの URL が YouTube・Vimeo・Spotify・CodePen・Gist の埋め込みになります。",
    },
    markdown: fence(
      "embed",
      [
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "title: Demo video",
        "caption: A short caption",
        "aspect: 16/9",
      ].join("\n"),
    ),
  },
  "@riebeckite/plugin-gallery": {
    title: { en: "Gallery cards", ja: "ギャラリーカード" },
    intro: {
      en: "A `gallery` YAML fence renders a responsive grid of cards — handy for theme or project showcases.",
      ja: "`gallery` の YAML フェンスがレスポンシブなカードグリッドを描画します。テーマやプロジェクトの紹介に便利です。",
    },
    markdown: fence(
      "gallery",
      [
        "columns: 3",
        "items:",
        "  - title: Default",
        "    description: A clean, typographic theme.",
        "    meta: v0.0.5",
        "    href: https://example.com/themes/default/",
        "  - title: Minimal",
        "    description: Stripped back to the essentials.",
        "    meta: v0.0.5",
        "    href: https://example.com/themes/minimal/",
        "  - title: Gruvbox",
        "    description: A warm, high-contrast palette.",
        "    meta: v0.0.5",
        "    href: https://example.com/themes/gruvbox/",
      ].join("\n"),
    ),
  },
  "@riebeckite/plugin-dataview": {
    title: { en: "Dataview", ja: "Dataview" },
    intro: {
      en: "A `dataview` query renders a table of notes from the manifest.",
      ja: "`dataview` クエリがマニフェストからノート一覧を描画します。",
    },
    markdown: fence(
      "dataview",
      [
        'TABLE file.name AS "Name", status',
        "FROM #project",
        'WHERE status = "active"',
        "SORT file.name asc",
        "LIMIT 10",
      ].join("\n"),
    ),
  },
  "@riebeckite/plugin-query": {
    title: { en: "Query", ja: "Query" },
    intro: {
      en: "A `query` fence is YAML that filters and sorts entries from the manifest.",
      ja: "`query` フェンスの YAML でマニフェストのエントリを絞り込み・並べ替えできます。",
    },
    markdown: fence(
      "query",
      [
        "filter:",
        "  tags:",
        "    any: [diary]",
        "sort:",
        "  field: date",
        "  order: desc",
        "limit: 5",
      ].join("\n"),
    ),
  },
  "@riebeckite/plugin-bases": {
    title: { en: "Base views", ja: "Base ビュー" },
    intro: {
      en: "A `base` YAML fence renders a Base table view.",
      ja: "`base` YAML フェンスが Base のテーブルビューを描画します。",
    },
    markdown: fence(
      "base",
      [
        "filters:",
        "  and:",
        '    - file.hasTag("featured")',
        "properties:",
        "  file.name:",
        "    displayName: Title",
        "views:",
        "  - type: table",
        "    name: Featured",
        "    limit: 10",
      ].join("\n"),
    ),
  },
  "@riebeckite/plugin-kanban": {
    title: { en: "Kanban boards", ja: "カンバンボード" },
    intro: {
      en: "A note whose body is `##` columns of task lists becomes a board; `#tags` and `[[wikilinks]]` work inside cards.",
      ja: "本文が `##` 列とタスクリストでできたノートはボードになります。カード内では `#タグ` や `[[ウィキリンク]]` も使えます。",
    },
    markdown: fence(
      "md",
      [
        "## Backlog",
        "",
        "- [ ] Draft the release notes",
        "- [ ] Link to [[index]]",
        "",
        "## Done",
        "",
        "- [x] Publish the fixture",
      ].join("\n"),
    ),
  },
};

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

/**
 * English-only content pages keep a `.en` suffix unless `en` is the default
 * language. `examples` is intentionally absent: it is localized like the
 * tour pages, with English as the fallback for untranslated languages.
 */
export const ENGLISH_ONLY_PAGES = new Set([
  "guide",
  "reference/plugins",
  "reference/themes",
]);

export function fence(language: string, body: string): string {
  const tick = "```";
  return `${tick}${language}\n${body}\n${tick}`;
}

export function hasPlugin(
  preset: ScaffoldPreset,
  packageName: string,
): boolean {
  return preset.plugins.some((plugin) => plugin.package === packageName);
}

/**
 * A demo key is either `@scope/package` or `@scope/package/topic`. Recover the
 * package name: the first two `/`-separated segments form the scoped name.
 */
export function demoPackage(key: string): string {
  return key.split("/", 2).join("/");
}

/**
 * The options object literal used for a plugin at this preset's depth, or
 * `null` when it takes no options at that depth.
 */
export function readmePluginOptions(
  variables: SiteTemplateVariables,
  preset: ScaffoldPreset,
  plugin: ScaffoldPreset["plugins"][number],
): string | null {
  return renderOptions(plugin.options, optionContext(preset, variables));
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

export const README_DEMO_ORDER = [
  "@riebeckite/plugin-obsidian-markdown/callout",
  "@riebeckite/plugin-obsidian-markdown/wikilinks",
  "@riebeckite/plugin-code-enhance",
  "@riebeckite/plugin-code-tabs",
  "@riebeckite/plugin-mermaid",
  "@riebeckite/plugin-d2",
  "@riebeckite/plugin-graphviz",
  "@riebeckite/plugin-chartjs",
  "@riebeckite/plugin-vega-lite",
  "@riebeckite/plugin-wavedrom",
  "@riebeckite/plugin-markmap",
  "@riebeckite/plugin-map",
  "@riebeckite/plugin-marp",
  "@riebeckite/plugin-qr-code",
  "@riebeckite/plugin-rich-embed",
  "@riebeckite/plugin-gallery",
  "@riebeckite/plugin-dataview",
  "@riebeckite/plugin-query",
  "@riebeckite/plugin-bases",
  "@riebeckite/plugin-kanban",
];

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
