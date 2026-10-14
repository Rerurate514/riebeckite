---
title: Taxonomy
sidebar:
  hidden: true
---

# Taxonomy

Grouping of content by tags, folders, or date into listing pages such as /tags/. Taxonomy pages are built from content collections and use permalinks for their links.

## Dimensions

- `tags` — from the `tags` frontmatter field.
- `folder` — from the directory structure.
- `date` — by year, month, or day.

## Taxonomy plugin options

The taxonomy plugin accepts `TaxonomyOptions` (`packages/plugins/taxonomy/src/types.ts`) which configure term generation and rendering. Key options include:

- `tags` (default: `true`) — generate tag term pages
- `folders` (default: `true`) — generate folder term pages
- `tagsBasePath` (default: `"/tags"`) — path prefix for tag pages
- `foldersBasePath` (default: `"/folders"`) — path prefix for folder pages
- `folderDepth` (default: `0`) — depth of folder grouping; `0` keeps the full path
- `minEntries` (default: `1`) — minimum entries required for a term to be generated
- `related` (default: `true`) — whether to show related-term navigation for tag terms
- `relatedLimit` (default: `8`) — maximum related terms per tag
- `feeds` — per-format feed generation (RSS, Atom, JSON)
- `dataEndpoint` (default: `"/taxonomy/index.json"`) — JSON data endpoint for app routes

```ts
// From packages/plugins/taxonomy/src/types.ts
export type TaxonomyOptions = {
  tags?: boolean;
  folders?: boolean;
  tagsBasePath?: string;
  foldersBasePath?: string;
  folderDepth?: number;
  minEntries?: number;
  related?: boolean;
  relatedLimit?: number;
  feeds?: TaxonomyFeedOptions;
  className?: string;
  dataEndpoint?: string;
  resolveTitle?: (context: TaxonomyTermContext) => string;
};
```

## Term rendering

Taxonomy terms are rendered by `renderTaxonomyPage` (`packages/plugins/taxonomy/src/pages.ts`), which produces a `TaxonomyPage` fragment with the term title, entry list, feed links, and related-term navigation. The page fragment is then wrapped by the site's route and layout.
