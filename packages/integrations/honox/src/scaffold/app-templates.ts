import type { ScaffoldPreset } from "./presets.js";

function hasScaffoldPlugin(
  preset: ScaffoldPreset,
  packageName: string,
): boolean {
  return preset.plugins.some((plugin) => plugin.package === packageName);
}

function articleTitleHelper(): string {
  return `
function getArticleTitle(slug: string, title: unknown): string {
  if (typeof title === "string" && title.trim().length > 0) return title;
  return slug.split("/").at(-1) ?? slug;
}
`;
}

export function server(): string {
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
export { config, content };
`;
}

export function client(): string {
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

export function appConfig(): string {
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
  buildDirectory: path.join(appRoot, ".riebeckite"),
  content: {
    ...resolvedConfig.content,
    directory: path.resolve(appRoot, resolvedConfig.content.directory),
  },
};
`;
}

export function appContent(): string {
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

export function paths(): string {
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

export function globalDeclarations(): string {
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

export function style(preset: ScaffoldPreset): string {
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
      "  display: inline-flex;",
      "  align-items: center;",
      "  gap: 0.5rem;",
      "  color: #111827;",
      "  font-weight: 700;",
      "  text-decoration: none;",
      "}",
      "",
      ".site-header__logo {",
      "  width: 1.75rem;",
      "  height: 1.75rem;",
      "  object-fit: contain;",
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
      ".article-shell__layout {",
      "  display: grid;",
      "  grid-template-columns: minmax(0, 1fr);",
      "  justify-content: center;",
      "  gap: var(--rb-layout-gap, 2rem);",
      "}",
      "",
      ".site-article__aside {",
      "  display: none;",
      "}",
      "",
      ".site-article__footer {",
      "  min-width: 0;",
      "}",
      "",
      "@media (min-width: 88rem) {",
      '  :is(:root, .rb-theme-root)[data-article-layout="article"] .article-shell__layout {',
      "    grid-template-columns: minmax(0, var(--rb-layout-article-max, 48rem));",
      "    position: relative;",
      "  }",
      "",
      '  :is(:root, .rb-theme-root)[data-article-layout="article"] .article-shell__body {',
      "    grid-column: 1;",
      "    grid-row: 1;",
      "  }",
      "",
      '  :is(:root, .rb-theme-root)[data-article-layout="article"] .site-article__footer {',
      "    grid-column: 1;",
      "  }",
      "",
      '  :is(:root, .rb-theme-root)[data-article-layout="article"] .site-article__aside {',
      "    display: block;",
      "    grid-column: 1;",
      "    grid-row: 1;",
      "    position: sticky;",
      "    top: 4rem;",
      "    align-self: start;",
      "    width: var(--rb-layout-sidebar, 14rem);",
      "    max-height: calc(100dvh - 8rem);",
      "    margin-inline-start: calc(",
      "      -1 * var(--rb-layout-sidebar, 14rem) -",
      "      var(--rb-layout-gap, 2rem)",
      "    );",
      "    overflow: auto;",
      "    padding-inline-end: 1rem;",
      "    border-inline-end: 1px solid",
      "      color-mix(in oklab, currentColor 18%, transparent);",
      "  }",
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

export function siteHeader(): string {
  return `import { ColorModeToggle } from "@riebeckite/plugin-color-mode";
import { config } from "../config";

export function SiteHeader() {
  return (
    <header class="site-header">
      <a href="/" class="site-header__home">
        <img
          src="/riebeckite-logo.png"
          alt=""
          class="site-header__logo"
          width="28"
          height="28"
        />
        {config.site.title}
      </a>
      <ColorModeToggle />
    </header>
  );
}
`;
}

export function article(): string {
  return `import type { PostContent } from "@riebeckite/core";
import { Article, ArticleContent, ArticleLayout } from "@riebeckite/honox/ui";

export function SiteArticle({
  post,
  propertiesHtml,
  afterHeaderHtml,
  afterMetaHtml,
  beforeContentHtml,
  afterContentHtml,
  asideHtml,
  footerHtml,
  asideContent,
  afterContent,
  footerContent,
}: {
  post: PostContent;
  propertiesHtml?: string;
  afterHeaderHtml?: string;
  afterMetaHtml?: string;
  beforeContentHtml?: string;
  afterContentHtml?: string;
  asideHtml?: string;
  footerHtml?: string;
  asideContent?: unknown;
  afterContent?: unknown;
  footerContent?: unknown;
}) {
  return (
    <Article class="site-article">
      <ArticleLayout>
        {asideContent}
        {asideHtml ? (
          <div
            class="site-article__aside"
            dangerouslySetInnerHTML={{ __html: asideHtml }}
          />
        ) : null}
        <ArticleContent>
          {afterHeaderHtml ? (
            <div
              class="site-article__after-header"
              dangerouslySetInnerHTML={{ __html: afterHeaderHtml }}
            />
          ) : null}
          {propertiesHtml ? (
            <div
              class="article-properties"
              dangerouslySetInnerHTML={{ __html: propertiesHtml }}
            />
          ) : null}
          {afterMetaHtml ? (
            <div
              class="site-article__after-meta"
              dangerouslySetInnerHTML={{ __html: afterMetaHtml }}
            />
          ) : null}
          {beforeContentHtml ? (
            <div
              class="site-article__before-content"
              dangerouslySetInnerHTML={{ __html: beforeContentHtml }}
            />
          ) : null}
          <div dangerouslySetInnerHTML={{ __html: post.html ?? "" }} />
          {afterContent}
          {afterContentHtml ? (
            <div
              class="site-article__after-content"
              dangerouslySetInnerHTML={{ __html: afterContentHtml }}
            />
          ) : null}
        </ArticleContent>
        {footerHtml || footerContent ? (
          <div class="site-article__footer">
            {footerHtml ? (
              <div dangerouslySetInnerHTML={{ __html: footerHtml }} />
            ) : null}
            {footerContent}
          </div>
        ) : null}
      </ArticleLayout>
    </Article>
  );
}
`;
}

export function renderer(preset: ScaffoldPreset): string {
  if (!preset.theme) return bareRenderer();
  const hasHeader = preset.appFiles.includes("header");
  const hasColorMode = preset.plugins.some(
    (plugin) => plugin.package === "@riebeckite/plugin-color-mode",
  );
  const hasSearch = hasScaffoldPlugin(preset, "@riebeckite/plugin-search");

  return `import type { PluginHeadTag } from "@riebeckite/core";
import { jsxRenderer } from "hono/jsx-renderer";
import { Link, Script } from "honox/server";
${hasColorMode ? `import { ColorModeScript } from "@riebeckite/plugin-color-mode";\n` : ""}${hasSearch ? `import { SearchBar } from "@riebeckite/plugin-search";\n` : ""}${hasHeader ? `import { SiteHeader } from "../components/site-header";\n` : ""}import { config } from "../config";

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

// Riebeckite plugin client entries need the HonoX client bundle even without
// an island component.
export const __importing_islands = true;

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
        <link rel="icon" href="/favicon.ico" />
${hasColorMode ? `        <ColorModeScript />\n` : ""}        <Link href="/app/style.css" rel="stylesheet" />
        {headTags.map(renderHeadTag)}
        <Script src="/app/client.ts" async />
      </head>
      <body class="riebeckite-page">
${hasHeader ? `        <SiteHeader />\n` : ""}${hasSearch ? `        <SearchBar />\n` : ""}        {children}
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

export function bareRenderer(): string {
  return `import { jsxRenderer } from "hono/jsx-renderer";
import { Link, Script } from "honox/server";
import { config } from "../config";

// Riebeckite plugin client entries need the HonoX client bundle even without
// an island component.
export const __importing_islands = true;

export default jsxRenderer(({ children }, c) => (
  <html lang={c.get("htmlLanguage") ?? config.site.locale}>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>{config.site.title}</title>
      <link rel="icon" href="/favicon.ico" />
      <Link href="/app/style.css" rel="stylesheet" />
      <Script src="/app/client.ts" async />
    </head>
    <body class="riebeckite-page">{children}</body>
  </html>
));
`;
}

export function indexRoute(preset: ScaffoldPreset): string {
  if (!preset.appFiles.includes("article")) return staticIndexRoute();

  const hasToc = hasScaffoldPlugin(preset, "@riebeckite/plugin-toc");
  const hasBacklinks = hasScaffoldPlugin(
    preset,
    "@riebeckite/plugin-backlinks",
  );
  const hasRecentPosts = hasScaffoldPlugin(
    preset,
    "@riebeckite/plugin-recent-posts",
  );
  const hasDailyNotes = hasScaffoldPlugin(
    preset,
    "@riebeckite/plugin-daily-notes",
  );
  const needsTitle = hasBacklinks || hasRecentPosts;
  const needsConfig = hasBacklinks || hasRecentPosts || hasDailyNotes;

  const importLines: string[] = [
    'import { createRoute } from "honox/factory";',
  ];
  if (hasBacklinks) {
    importLines.push(
      'import { Backlinks, getPublishedBacklinks } from "@riebeckite/plugin-backlinks";',
    );
  }
  if (hasDailyNotes) {
    importLines.push(
      'import { DailyNotes, getDailyNotes } from "@riebeckite/plugin-daily-notes";',
    );
  }
  if (hasRecentPosts) {
    importLines.push(
      'import { RecentPosts, getRecentPosts } from "@riebeckite/plugin-recent-posts";',
    );
  }
  if (hasToc) {
    importLines.push(
      'import { extractTableOfContents, TableOfContents } from "@riebeckite/plugin-toc";',
    );
  }
  importLines.push('import { SiteArticle } from "../components/article";');
  if (needsConfig) importLines.push('import { config } from "../config";');
  importLines.push('import { content } from "../content";');

  const dataLines: string[] = [];
  if (hasBacklinks) {
    dataLines.push(
      '  const backlinks = getPublishedBacklinks({ manifest, config, slug: "index", resolveTitle: getArticleTitle });',
    );
  }
  if (hasRecentPosts) {
    dataLines.push(
      "  const recentPosts = await getRecentPosts({ posts: manifest.discoverableEntries, config, getProcessedContent: (slug) => content.getProcessedContent(slug), resolveTitle: getArticleTitle });",
    );
  }
  if (hasDailyNotes) {
    dataLines.push("  const dailyNotes = getDailyNotes({ manifest, config });");
  }
  if (hasToc) {
    dataLines.push(
      '  const tableOfContents = extractTableOfContents(post.html ?? "");',
    );
  }

  const propLines: string[] = [
    "        propertiesHtml={indexEntry?.bodySlots?.properties}",
    '        afterHeaderHtml={indexEntry?.bodySlots?.["article.after-header"]}',
    '        afterMetaHtml={indexEntry?.bodySlots?.["article.after-meta"]}',
    '        beforeContentHtml={indexEntry?.bodySlots?.["article.before-content"]}',
    '        afterContentHtml={indexEntry?.bodySlots?.["article.after-content"]}',
    '        asideHtml={indexEntry?.bodySlots?.["article.aside"]}',
    '        footerHtml={indexEntry?.bodySlots?.["article.footer"]}',
  ];
  if (hasToc) {
    propLines.push(
      '        asideContent={<TableOfContents className="table-of-contents--desktop" items={tableOfContents} />}',
    );
  }
  const afterChildren: string[] = [];
  if (hasRecentPosts) afterChildren.push("<RecentPosts posts={recentPosts} />");
  if (hasDailyNotes) afterChildren.push("<DailyNotes notes={dailyNotes} />");
  if (afterChildren.length > 0) {
    propLines.push(`        afterContent={<>${afterChildren.join("")}</>}`);
  }
  if (hasBacklinks) {
    propLines.push(
      "        footerContent={<Backlinks backlinks={backlinks} />}",
    );
  }

  const titleHelper = needsTitle ? articleTitleHelper() : "";
  const dataBlock = dataLines.length > 0 ? `\n${dataLines.join("\n")}\n` : "";

  return `${importLines.join("\n")}

export default createRoute(async (c) => {
  const manifest = await content.getManifest();
  const indexEntry = manifest.bySlug.get("index");
  if (indexEntry && indexEntry.permalink !== "/") {
    return c.redirect(indexEntry.permalink, 308);
  }

  const post = await content.getProcessedContent("index");
  if (indexEntry?.publishing?.routable === false) {
    return c.notFound();
  }
${dataBlock}
  if (indexEntry) {
    c.set("htmlLanguage", indexEntry.publicLocation.metadata?.["l10n.lang"]);
    c.set("headTags", indexEntry.headTags ?? []);
  }

  return c.render(
    <SiteArticle
      post={post}
${propLines.join("\n")}
    />,
  );
});${titleHelper}`;
}

export function staticIndexRoute(): string {
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

export function slugRoute(preset: ScaffoldPreset): string {
  const hasToc = hasScaffoldPlugin(preset, "@riebeckite/plugin-toc");
  const hasBacklinks = hasScaffoldPlugin(
    preset,
    "@riebeckite/plugin-backlinks",
  );
  const hasLocalGraph = hasScaffoldPlugin(
    preset,
    "@riebeckite/plugin-local-graph",
  );
  const needsTitle = hasBacklinks || hasLocalGraph;
  const needsConfig = hasBacklinks || hasLocalGraph;
  const needsManifest = hasBacklinks || hasLocalGraph;

  const importLines: string[] = [
    "import {",
    "  contentRouteSsgParams,",
    "  pluginPageSsgParams,",
    "  resolveRiebeckiteRoute,",
    '} from "@riebeckite/honox/server";',
  ];
  if (hasBacklinks) {
    importLines.push(
      'import { Backlinks, getPublishedBacklinks } from "@riebeckite/plugin-backlinks";',
    );
  }
  if (hasLocalGraph) {
    importLines.push(
      'import { LocalGraph, getLocalGraph } from "@riebeckite/plugin-local-graph";',
    );
  }
  if (hasToc) {
    importLines.push(
      'import { extractTableOfContents, TableOfContents } from "@riebeckite/plugin-toc";',
    );
  }
  importLines.push('import { createRoute } from "honox/factory";');
  importLines.push('import { SiteArticle } from "../components/article";');
  if (needsConfig) importLines.push('import { config } from "../config";');
  importLines.push('import { content } from "../content";');

  const dataLines: string[] = [];
  if (needsManifest) {
    dataLines.push("    const manifest = await content.getManifest();");
  }
  if (hasBacklinks) {
    dataLines.push(
      "    const backlinks = getPublishedBacklinks({ manifest, config, slug: route.entry.slug, resolveTitle: getArticleTitle });",
    );
  }
  if (hasLocalGraph) {
    dataLines.push(
      "    const localGraph = getLocalGraph({ manifest, config, slug: route.entry.slug, resolveTitle: getArticleTitle });",
    );
  }
  if (hasToc) {
    dataLines.push(
      '    const tableOfContents = extractTableOfContents(post.html ?? "");',
    );
  }

  const propLines: string[] = [
    "        propertiesHtml={route.entry.bodySlots?.properties}",
    '        afterHeaderHtml={route.entry.bodySlots?.["article.after-header"]}',
    '        afterMetaHtml={route.entry.bodySlots?.["article.after-meta"]}',
    '        beforeContentHtml={route.entry.bodySlots?.["article.before-content"]}',
    '        afterContentHtml={route.entry.bodySlots?.["article.after-content"]}',
    '        asideHtml={route.entry.bodySlots?.["article.aside"]}',
    '        footerHtml={route.entry.bodySlots?.["article.footer"]}',
  ];
  if (hasToc) {
    propLines.push(
      '        asideContent={<TableOfContents className="table-of-contents--desktop" items={tableOfContents} />}',
    );
  }
  const footerChildren: string[] = [];
  if (hasLocalGraph) {
    footerChildren.push("{localGraph && <LocalGraph graph={localGraph} />}");
  }
  if (hasBacklinks) {
    footerChildren.push("<Backlinks backlinks={backlinks} />");
  }
  if (footerChildren.length > 0) {
    propLines.push(`        footerContent={<>${footerChildren.join("")}</>}`);
  }

  const titleHelper = needsTitle ? articleTitleHelper() : "";
  const dataBlock = dataLines.length > 0 ? `\n${dataLines.join("\n")}\n` : "";

  return `${importLines.join("\n")}

export default createRoute(
  contentRouteSsgParams("/:slug{.+}", async () => {
    const manifest = await content.getManifest();
    const contentPaths = manifest.publicEntries
      .filter((entry) => entry.permalink !== "/")
      .map((entry) => ({ slug: entry.permalink.replace(/^\\/+/, "") }));
    return [...contentPaths, ...(await pluginPageSsgParams(content))];
  }),
  async (c) => {
    const requestedSlug = c.req.param("slug");
    if (!requestedSlug) return c.notFound();
    if (/\\.[a-zA-Z0-9]+$/.test(requestedSlug)) return c.notFound();

    const route = await resolveRiebeckiteRoute(content, c.req.path);
    if (!route) return c.notFound();
    if (route.kind === "redirect")
      return c.redirect(route.location, route.status);
    if (route.kind === "page") {
      c.set("headTags", route.page.headTags ?? []);
      return c.render(
        <div dangerouslySetInnerHTML={{ __html: route.page.body }} />,
      );
    }

    const post = await content.getProcessedContent(route.entry.slug);
${dataBlock}
    c.set("htmlLanguage", route.entry.publicLocation.metadata?.["l10n.lang"]);
    c.set("headTags", route.entry.headTags ?? []);

    return c.render(
      <SiteArticle
        post={post}
${propLines.join("\n")}
      />,
    );
  },
);${titleHelper}`;
}
