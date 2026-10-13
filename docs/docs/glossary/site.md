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

## Head and slot handoff

Plugins only describe `headTags` / `bodySlots`; the site owns rendering.

```tsx
<PluginHeadTags tags={headTagsFromManifest} />
```

```tsx
<ContentSlot slots={bodySlots} name="article.header" />
```

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
