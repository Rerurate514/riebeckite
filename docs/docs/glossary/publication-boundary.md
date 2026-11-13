---
date: 2026-10-14
title: Publication Boundary
sidebar.hidden: true
---

# Publication Boundary

The rule that decides which content is safe to publish. Riebeckite applies the publish strategy and frontmatter and centralizes the decision rather than scattering publish checks.

## Strategy and frontmatter details

The publication boundary centralizes publish decisions rather than scattering checks. Detailed information:

- **Publish strategy** `explicit` (default): Only notes with `publish: true` are public. Controlled by `content.filters.publishStrategy` in `ResolvedRiebeckiteConfig` (`packages/core/src/types/resolved_riebeckite_config.ts`).
- **Publish strategy** `selective`: Notes are public unless they set `private: true` or `draft: true`.
- **Frontmatter `visibility: draft`**: Keeps a note out of both the routable and discoverable sets. Nothing is generated for it.
- **Frontmatter `visibility: unlisted`**: Serves the note at its permalink but does not include it in navigation, taxonomy, search, feeds, sitemaps, graphs, or the hover-preview index.

Example config with the default `explicit` publish strategy (shown for clarity):

```ts
// riebeckite.config.ts
export default {
  content: {
    directory: "content",
    filters: {
      publishStrategy: "explicit",
    },
  },
};
```

Example frontmatter to opt a note in:

```yaml
---
title: "Public note"
publish: true
---
```

To keep a note out under `selective`, use `private: true` or `draft: true`.

Example frontmatter for unlisted:

```yaml
---
title: "Unlisted note"
visibility: unlisted
---
```

## One decision point

Because the decision is centralized, every consumer sees the same public set. Pages, feeds, and sitemaps do not re-check publishing on their own. The publish state is resolved once during manifest building and then read from the manifest's `publishing` field on each `ContentManifestEntry`.
