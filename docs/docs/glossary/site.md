---
title: Site
sidebar:
  hidden: true
---

# Site

The site application owns routes, the document frame, metadata, and HTML safety. It connects Riebeckite core behavior to HonoX and Vite through the `@riebeckite/honox` integration, deciding how plugin contributions are composed into the final public UI.

## Application structure

The site has these source directories (not in integration, theme, or plugin):

```text
app/routes/       — URL handling, page composition, redirects, response metadata
app/components/ — Reusable site presentation and composition of public UI primitives
app/islands/      — Optional interactive UI and its client-side state
app/style.css     — Visual tokens, layout, typography, and imports of generated extension styles
```

## Route resolution

The route resolver (`resolveRiebeckiteContentRequest`) resolves content, plugin pages, redirects, and not-found in order.

Plugins provide information and UI fragments; the site decides where they are rendered.

## Plugin UI composition

Plugins contribute `headTags` and expose data helpers + JSX components. The Site composes these components in its own TSX, choosing whether, where, and how often to render each one. Each plugin's data helper receives a `PublicContentView` (or similar filtered facade) and returns a typed model; the component is then rendered directly by the site's article layout or page template.

There is no `bodySlots` field on `ContentManifestEntry`; instead, plugin UI is composed explicitly:

```tsx
const view = createPublicContentView(manifest);
const entry = view.findRoutableBySlug(slug);
const backlinks = await getBacklinks({ view, slug });
<Backlinks items={backlinks} />
```

and

```tsx
const data = getProperties({ view, frontmatter: entry.frontmatter });
<Properties data={data} />
```

The Site decides layout placement — there is no accumulated `bodySlots` map or `ContentSlot` primitive. Plugin components may also export optional CSS and client entries, registered through the integration.

## SiteConfig Structure

The full `SiteConfig` interface from `packages/core/src/types/site_config.ts` defines the site metadata:

| Field | Type | Description |
| --- | --- | --- |
| `title` | `string` | Site title, used in `<title>` and headers |
| `description` | `string \| undefined` | Site description meta tag |
| `author` | `string \| undefined` | Author name, used in metadata |
| `baseUrl` | `string \| undefined` | Base URL for the site (e.g., `https://example.com`) |
| `locale` | `string \| undefined` | Locale code (e.g., `en`, `ja`) |
| `twitterSite` | `string \| undefined` | Twitter `@` handle for card attribution |
| `defaultOgImage` | `feed \| undefined` | RSS/Atom feed configuration (title, description, language) |

Each field is used as follows:
- **title**: Rendered in the document `<title>` and page headers
- **description**: Added as a `<meta name="description">` tag
- **author**: Added to author metadata and schema.org markup
- **baseUrl**: Used for generating canonical URLs and sitemap
- **locale**: Sets the `lang` attribute on `<html>` and affects formatting
- **twitterSite**: Added to Twitter card metadata
- **defaultOgImage**: Used as the default `og:image` when no per-page image is provided
- **feed**: Used to generate the site's RSS/Atom feed

```ts
export interface SiteConfig {
  title: string;
  description?: string;
  author?: string;
  baseUrl?: string;
  locale?: string;
  twitterSite?: string;
  defaultOgImage?: string;
  feed?: {
    title?: string;
    description?: string;
    language?: string;
  };
}
```

## Field Usage Across the Site

The fields above flow through the `@riebeckite/honox` integration (`packages/core/src/`) to compose the final public UI. The `title` and `description` appear in `<head>`, `author` and `twitterSite` in social metadata, `baseUrl` in URL generation, and `locale` in the `lang` attribute.

## Related terms

- [[glossary/obsidian-vault|Obsidian Vault]]
- [[tag|Tag]]
- [[shortcode|Shortcode]]
- [[callout|Callout]]
- [[sidenote|Sidenote]]
- [[backlink|Backlink]]
- [[glossary/ui|UI]]

## Learn more

- [HonoX Site](../framework/honox-integration/site.md)