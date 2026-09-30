import type { ScaffoldPreset } from "./presets.js";

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

export function siteHeader(): string {
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

export function article(): string {
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

export function renderer(preset: ScaffoldPreset): string {
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

export function bareRenderer(): string {
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

export function indexRoute(preset: ScaffoldPreset): string {
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

export function slugRoute(): string {
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
