# HonoX Integration

`@riebeckite/honox` connects portable Core behavior to HonoX and Vite. It owns application-root/config resolution, Vite development and build integration, SSG extension mapping, generated plugin/theme style entries, and the HonoX application build workflow.

## Public API

The integration exports `riebeckite`, `loadRiebeckiteConfig`, `resolveHonoxApplication`, `buildHonoxApplication`, `resolveHonoxApplicationRoot`, `startHonoxDevServer`, `riebeckiteSsg`, and `riebeckiteSsgExtensionMap`.

The Vite plugin accepts optional `configRoot`, `appRoot`, `configFile`, and the monorepo-only `workspaceRoot`. `appRoot` defaults to the Vite root, and `configRoot` defaults to `appRoot`. A config path is imported relative to `configRoot`; `content.directory` is resolved relative to `appRoot`. `resolveHonoxApplication` returns these roots together with the resolved config, so CLI and Vite use the same model. `workspaceRoot` is only for source-package aliases during monorepo development; installed npm consumers use their own `node_modules` without it. The plugin creates generated import entries below `app/.riebeckite/` and exposes the required client module. Generated files are integration output: do not edit them as application source.

Use `riebeckiteSsg({ entry, extensionMap })` for static generation. It starts
its internal Vite server with the resolved application root and define values,
so invoking `riebeckite build` from a subdirectory yields the same output as
invoking it from the application root.

## UI primitives

`@riebeckite/honox/ui` is deliberately a small structural contract, not a
component framework. Its complete public component surface is:

- `Article`, `ArticleLayout`, `ArticleHeader`, `ArticleContent`,
  `ArticleMeta`, and `ArticleFooter` for an article page;
- `Sidebar` for complementary content.

The corresponding `*Props` types are public. These stable styling hooks are
the only classes supplied by the contract: `rb-article`, `rb-article-layout`,
`rb-article-header`, `rb-article-body`, `rb-article-meta`,
`rb-article-footer`, and `rb-sidebar`, in the component order above.
Primitives provide semantic HTML, those hooks, and `class`/`className`
composition only. They do not own article copy, metadata formatting,
navigation, cards, page layouts, islands, or CSS. Those belong to the site
application. `ArticleHeader` and `ArticleContent` accept either children or
their HTML input prop, never both.

```tsx
import {
  Article,
  ArticleContent,
  ArticleHeader,
  ArticleLayout,
  ArticleMeta,
} from "@riebeckite/honox/ui";

<Article class="prose">
  <ArticleLayout aside={<nav>…</nav>}>
    <ArticleContent>
      <ArticleHeader dangerouslySetInnerHTML={{ __html: lead }} />
      <ArticleMeta>…</ArticleMeta>
      <div dangerouslySetInnerHTML={{ __html: body }} />
    </ArticleContent>
  </ArticleLayout>
</Article>;
```

Use the primitives as composition points, then style them from the site. Do not
import files below `@riebeckite/honox/src/` or rely on any unlisted component.

## Site application contract

A Riebeckite site is a normal HonoX application. The integration supplies
content and build wiring; the application owns every user-facing decision.
Keep the following source directories in the site, rather than in an
integration, theme, or plugin:

| Directory | Site-owned responsibility |
| --- | --- |
| `app/routes/` | URL handling, page composition, redirects, and response metadata |
| `app/components/` | Reusable site presentation and composition of the public UI primitives |
| `app/islands/` | Optional interactive UI and its client-side state |
| `app/style.css` and local CSS | Visual tokens, layout, typography, and imports of generated extension styles |

`app/routes/_renderer.tsx` is the site shell. It owns the document head,
navigation, page chrome, and the application client entry. A route obtains a
post from `ContentManager`, resolves request URLs with
`resolveContentRoute(manifest, c.req.path)`, then chooses its own component
tree. The reference application in `apps/web` is one implementation, not a
required layout.

### Head tag handoff

When a plugin provides document head tags, the shell still belongs to the
site. A plugin only describes `meta` / `link` / `script` on
`ContentManifestEntry.headTags`; it never renders them. A site route passes the
value to the shell with `c.set("headTags", entry.headTags ?? [])`, and
`app/routes/_renderer.tsx` decides whether to render it. A plugin does not own
the `<head>` or the tag order.

```tsx
// app/routes/_renderer.tsx
const headTags = c.get("headTags") ?? [];

<head>
  {headTags.map((tag) =>
    tag.tag === "meta" ? <meta {...tag.attrs} /> : null,
  )}
</head>;
```

For example, `@riebeckite/plugin-discord-embed`, which aligns the Discord embed
color, supplies `theme-color` through this contract.

For example, an external site can compose an article with the stable primitive
contract while retaining all presentation ownership:

```tsx
// app/components/article.tsx
import type { PostContent } from "@riebeckite/core";
import { Article, ArticleContent, ArticleLayout } from "@riebeckite/honox/ui";

export function SiteArticle({ post }: { post: PostContent }) {
  return (
    <Article class="site-article">
      <ArticleLayout>
        <ArticleContent html={post.html ?? ""} />
      </ArticleLayout>
    </Article>
  );
}
```

Import generated extension styles from the site's stylesheet, but never edit
the generated files themselves:

```css
/* app/style.css */
@import "./.riebeckite/plugin-styles.css";
@import "./.riebeckite/theme-styles.css";

.site-article { max-width: 48rem; margin: 0 auto; }
```

Islands are also ordinary application modules. Place a HonoX island under
`app/islands/`, import it from the route or component that owns it, and keep
its hydration and client state local to the site. `app/client.ts` must continue
to initialize both `createClient()` and `initRiebeckiteClient()`; the latter
starts browser entries contributed by installed plugins and themes. A plugin
may contribute its own client entry, but it must not take ownership of a
site's routes, shell, components, islands, or CSS decisions.

The external-site E2E fixture contains this minimal arrangement: a site shell,
a local article component built from `@riebeckite/honox/ui`, a local island,
and site CSS. It is built from packed npm artifacts, so it is the supported
example for copying and overriding these boundaries.

## Boundary rules

Article routing resolves a request against the manifest's already-resolved public locations (`byPermalink`, then `redirects`), never by inferring a URL from a filesystem path, directory layout, or slug. A slug remains an internal content lookup key; the public URL is the resolved `permalink`.

Keep HonoX, Vite, Cloudflare, and route APIs in this package or `apps/web`; Core remains portable. A plugin can expose assets, client entries, endpoints, and renderers, but Core does not become a HonoX router. The application decides concrete route composition and islands.

Use [Build system](build-system.md) for state behavior and [Architecture](architecture.md) for package ownership.
