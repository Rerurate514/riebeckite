export const previewContent = new Map<string, string>([
  [
    "index.md",
    `---
title: Theme preview
visibility: public
---

# Theme preview

Use this isolated site to inspect the local Theme. It never reads or writes the site's Vault.

- [Article](/article)
- [Documentation](/docs)
- [Components](/components)
`,
  ],
  [
    "article.md",
    `---
title: Article
visibility: public
---

# Heading one

## Heading two

### Heading three

#### Heading four

##### Heading five

###### Heading six

A paragraph with a [link](/docs) and \`inline code\`.

> A blockquote makes long-form reading styles visible.

- First item
- Second item
  - Nested item

1. First step
2. Second step

| Token | Meaning |
| --- | --- |
| Paper | Background |
| Ink | Text |

\`\`\`ts
export const preview = "theme";
\`\`\`

![Preview image](/preview.svg)

---
`,
  ],
  [
    "docs/index.md",
    `---
title: Documentation
visibility: public
---

# Documentation

## Navigation

The sidebar, table of contents, and previous/next links use the installed Riebeckite Plugins.

> **Note**
> This preview uses only deterministic local fixture content.

## Read next

Continue to the [Components](/components) page.
`,
  ],
  [
    "components.md",
    `---
title: Components
visibility: public
---

# Components

This page renders existing Riebeckite primitives alongside standard HTML controls.

## Tags

#theme #preview #accessibility

## Empty state

No additional content is available.
`,
  ],
]);

export const previewApplication = new Map<string, string>([
  [
    "public/preview.svg",
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="240" viewBox="0 0 640 240">
  <rect width="640" height="240" fill="#d9d9d9" />
  <text x="320" y="120" text-anchor="middle" dominant-baseline="middle" fill="#333" font-family="sans-serif" font-size="24">Theme preview image</text>
</svg>
`,
  ],
  [
    "app/routes/_renderer.tsx",
    `import { createPublicContentView } from "@riebeckite/core";
import { RiebeckiteHead, ThemeRoot } from "@riebeckite/honox/ui";
import { ColorModeToggle } from "@riebeckite/plugin-color-mode";
import { SiteProvider } from "@riebeckite/ui";
import { jsxRenderer } from "hono/jsx-renderer";
import { content } from "virtual:riebeckite/content";
import { config } from "virtual:riebeckite/config";

export const __importing_islands = true;

export default jsxRenderer(async ({ children }, c) => {
  const manifest = await content.getManifest();

  return (
    <SiteProvider
      config={config}
      manifest={manifest}
      view={createPublicContentView(manifest)}
      path={c.req.path}
      language={c.get("htmlLanguage")}
      headTags={c.get("headTags")}
    >
      <ThemeRoot>
        <head>
          <RiebeckiteHead />
        </head>
        <body class="riebeckite-page rb-site">
          <header class="rb-site-header">
            <a href="/">Theme preview</a>
            <nav aria-label="Preview pages">
              <a href="/article">Article</a>
              <a href="/docs">Documentation</a>
              <a href="/components">Components</a>
            </nav>
            <ColorModeToggle />
          </header>
          <main id="main-content">{children}</main>
        </body>
      </ThemeRoot>
    </SiteProvider>
  );
});
`,
  ],
  [
    "app/routes/[...slug].tsx",
    `import { createContentRoute } from "@riebeckite/honox/server";
import { SiteArticle } from "../components/article";
import { config } from "virtual:riebeckite/config";
import { content } from "virtual:riebeckite/content";

export default createContentRoute({
  content,
  config,
  render: () => <SiteArticle />,
});
`,
  ],
  [
    "app/components/article.tsx",
    `import {
  Article,
  ArticleBody,
  ArticleContent,
  ArticleFooter,
  ArticleLayout,
  Sidebar,
} from "@riebeckite/honox/ui";
import { DocsPrevNext, DocsSidebar } from "@riebeckite/plugin-docs";
import { TableOfContents } from "@riebeckite/plugin-toc";
import { useArticleContext } from "@riebeckite/ui";

export function SiteArticle() {
  const article = useArticleContext();

  return (
    <ArticleLayout class="theme-preview-layout">
      <Sidebar label="Documentation navigation">
        <DocsSidebar />
      </Sidebar>
      <Article class="site-article">
        <ArticleContent>
          <ArticleBody />
          {article?.entry.slug === "components" ? <ComponentShowcase /> : null}
        </ArticleContent>
        <ArticleFooter>
          <DocsPrevNext />
        </ArticleFooter>
      </Article>
      <Sidebar label="Table of contents">
        <TableOfContents />
      </Sidebar>
    </ArticleLayout>
  );
}

function ComponentShowcase() {
  return (
    <section aria-labelledby="interactive-controls">
      <h2 id="interactive-controls">Interactive controls</h2>
      <div class="theme-preview-cards">
        <article class="theme-preview-card">
          <h3>Card</h3>
          <p>A semantic card for checking spacing and surface styles.</p>
          <a href="/article">Read the article</a>
        </article>
        <form class="theme-preview-form">
          <label for="preview-input">Label</label>
          <input id="preview-input" name="preview-input" placeholder="Focus this field" />
          <button type="submit">Submit</button>
        </form>
      </div>
    </section>
  );
}
`,
  ],
  [
    "app/style.css",
    `@import "./.riebeckite/framework-styles.css";
@import "./.riebeckite/plugin-styles.css";
@import "./.riebeckite/theme-styles.css";

.riebeckite-page {
  margin: 0;
}

.rb-site-header,
.theme-preview-layout,
.theme-preview-cards,
.theme-preview-form {
  display: flex;
  gap: 1rem;
}

.rb-site-header,
.theme-preview-layout {
  padding: 1rem;
}

.rb-site-header {
  align-items: center;
  justify-content: space-between;
}

.theme-preview-layout {
  align-items: start;
}

.site-article {
  min-width: 0;
  flex: 1;
}

.theme-preview-cards {
  flex-wrap: wrap;
}

.theme-preview-card,
.theme-preview-form {
  flex: 1 1 16rem;
  flex-direction: column;
  padding: 1rem;
  border: 1px solid currentColor;
}
`,
  ],
]);
