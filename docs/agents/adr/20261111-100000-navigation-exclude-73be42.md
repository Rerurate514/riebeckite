# Exclude derived navigation paths

- **Status:** Accepted
- **Date:** 2026-11-11
- **Related Design Principles:** [Design Philosophy](../../docs/philosophy.md)
- **Related Changes / PR:** `changes/unreleased/20261110-175317-navigation-exclude-5a4b8d.md`

## Context

Sites need to publish internal notes while omitting their folders from every rendering of the derived navigation. Filtering items in each site component duplicates the rule and can leave a header, mobile menu, or sidebar inconsistent.

## Decision

`navigation()` accepts an `exclude` list of derived slug paths. A path excludes its matching entry and every descendant before the navigation tree is built. Authored `items` remain unchanged.

## Alternatives

- Exclude content globally: this also removes routing and publishing, which is broader than navigation visibility.
- Filter rendered items in each Site component: this duplicates policy across rendering locations.
- Require authored `items`: this replaces useful automatic derivation for a single omission.

## Consequences

Derived navigation has one configuration source for all renderers. Exclusion rules use slug paths rather than labels, so title changes and localization do not alter their meaning. Future matching options must preserve exact-path and descendant semantics.
