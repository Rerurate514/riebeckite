# Exclude derived discovery projections

- **Status:** Accepted
- **Date:** 2026-11-11
- **Related Design Principles:** [Design Philosophy](../../docs/philosophy.md)
- **Related Changes / PR:** `changes/unreleased/20261111-110000-discovery-projection-exclude-a7c91e.md`

## Context

Published notes can be inappropriate for selected discovery projections without being removed from their URLs. Taxonomy, generated folder pages, and the garden explorer each derive their own public listings from discoverable entries.

## Decision

`taxonomy()`, `folderPages()`, and `gardenExplorer()` accept an `exclude` list of slug paths. A path excludes its matching entry and descendants before the plugin builds its derived data. Taxonomy applies the rule to terms, feeds, and data; folder pages apply it to generated listings; the garden explorer applies it to notes, graph data, tags, and folders.

Search, archive, related-posts, and backlinks do not receive this option. Sites that must remove content from every public discovery surface use visibility controls or content exclusion instead.

## Alternatives

- Exclude content globally: this also removes routing and publishing, which is broader than selected discovery projections.
- Filter each rendered component: this duplicates policy and misses generated feeds or data.
- Add the option to every discovery plugin: this obscures the different contracts of search and link-oriented projections.

## Consequences

The three listing projections use the same exact-path and descendant semantics as derived navigation, based on stable slugs rather than labels. Published URLs remain available, and users must configure other discovery surfaces separately when required.
