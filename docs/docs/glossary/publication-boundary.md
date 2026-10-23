---
date: 2026-10-14
title: Publication Boundary
sidebar:
  hidden: true
---

# Publication Boundary

The rule that decides which content is safe to publish. Riebeckite applies the publish strategy and frontmatter and centralizes the decision rather than scattering publish checks.

## Strategy and frontmatter details

The publication boundary centralizes publish decisions rather than scattering checks. Detailed information:

- **Publish strategy** `selective`: Only content marked for publishing is public. Controlled by `content.filters.publishStrategy` in `ResolvedRiebeckiteConfig` (`packages/core/src/types/resolved_riebeckite_config.ts`).
- **Frontmatter `published: false`**: Keeps a note out of the public set. The note is still available through direct URL if known, but does not appear in navigation, search, feeds, or sitemaps.
- **Frontmatter `visibility: unlisted`**: Serves the note without listing it in indexes. The note is publicly accessible via its permalink but does not appear in taxonomy lists, search results, or sitemaps.

Example config with `selective` publish strategy:

```ts
// riebeckite.config.ts
export default {
  content: {
    directory: "content",
    filters: {
      publishStrategy: "selective",
    },
  },
};
```

Example frontmatter to control publication:

```yaml
---
title: "Draft note"
published: false
---
```

Example frontmatter for unlisted:

```yaml
---
title: "Unlisted note"
visibility: unlisted
---
```

## One decision point

Because the decision is centralized, every consumer sees the same public set. Pages, feeds, and sitemaps do not re-check publishing on their own. The publish state is resolved once during manifest building and then read from the manifest's `publishing` field on each `ContentManifestEntry`.
