# Localization policy audit (2026-11)

## Scope

This audit covers every plugin under `packages/plugins` that reads resolved
content or emits generated pages. It records the locale source, the behavior
before the change, the expected behavior, the root cause, and the tests that
cover the fix.

The shared policy is implemented in Core:

- `ContentManifest.localization` (`defaultLocale`, `locales`, `fallbackLocale`)
- `resolvePageLocale(manifest, pathname)`
- `selectLocalizedEntries(entries, { mode, locale, fallbackLocale })`
- `queryContentEntries({ filter: { locale } })`
- `localizedPagePath()` / `localizedPagePaths()`

`current` is the default for listing plugins. `fallback` resolves per
translation identity. `all` never deduplicates. A site without
`manifest.localization` keeps the previous behavior.

## Root cause of the Timeline duplicate rows

`timeline/index.ts` built its page from `manifest.discoverableEntries` without
reading a page locale, and it emitted only one path (`/timeline`). On the
documentation site, both `docs/plugins/foo.md` and `docs/plugins/foo.ja.md` are
discoverable, have the same frontmatter date, and often the same English title.
They were therefore rendered as two rows with the same date and title. The l10n
plugin had already resolved their language and URL, but no listing plugin
consumed that information.

The same missing page-locale context affected Archive, Related Posts,
Backlinks, Recent Posts, Taxonomy, Series, Glossary, Garden Explorer, Dataview,
and Bases. Search already stored `language` on each item, but the modal did not
scope queries to the current document language.

## Plugin inventory

| Plugin | Locale source | Before | After | Root cause | Test |
| --- | --- | --- | --- | --- | --- |
| Timeline | page locale + `manifest.localization` | one page, all discoverable entries | one page per locale, `localeMode` default `current`, fallback badge | no locale context or localized page paths | `packages/plugins/timeline/test/timeline.test.ts` |
| Archive | page locale + `manifest.localization` | all entries; locale only formatted labels | per-locale archive paths, locale-filtered collections | locale option was display-only | `packages/plugins/archive/test/archive.test.ts` |
| Recent Posts | `SiteProvider.language` | all discoverable dated notes | current page language via `getRecentPosts({ locale })` | component did not pass page language | `packages/plugins/recent-posts/test/recent-posts.test.ts` |
| Related Posts | entry language | scored every language | candidate pool scoped by `localeMode` | no language filter before ranking | Core policy tests + existing `related.test.ts` |
| Backlinks | entry language | every discoverable incoming note | current-language incoming notes | no language filter | `packages/plugins/backlinks/test/backlinks.test.ts` |
| Search | document `lang` + item `language` | indexed every language and searched all | current-language by default, explicit `lang:` still available | modal ignored the page language | `packages/plugins/search/test/search.test.ts` |
| Taxonomy (tags/folders) | page locale + `manifest.localization` | one index for every language | per-locale term paths and indexes | terms built from the global manifest | `packages/plugins/taxonomy/test/taxonomy.test.ts` |
| Series | page locale + `manifest.localization` | one list and landing pages for every language | per-locale list/landing pages, locale-scoped navigation | members were not filtered by language | Core policy tests + existing `series.test.ts` |
| Glossary | page locale + `manifest.localization` | one page for every language | per-locale glossary pages | no locale context | Core policy tests + existing glossary tests |
| Folder Pages | entry language | already emitted per-language folders | unchanged | already correct | existing folder-pages tests |
| Navigation | `SiteProvider.language` | already filtered with `selectEntriesByLanguage` | unchanged | already correct | existing navigation tests |
| Docs Navigation | current entry language | already filtered | unchanged | already correct | existing docs tests |
| Garden Explorer | page locale + `manifest.localization` | one `/explore` page with all nodes | per-locale `/explore` pages, `localeMode` default `current` | no locale context | Core policy tests + existing garden-explorer tests |
| Dataview | entry language | queried every discoverable note | per-entry locale policy, `localeMode` | query view was global | Core policy tests + existing dataview tests |
| Bases | entry/page locale | queried every discoverable note | per-entry/page locale policy, `localeMode` | query view was global | Core policy tests + existing bases tests |
| Local Graph | graph neighbors | keeps cross-language links | unchanged by design | graph is the Obsidian-compatible relationship surface | existing local-graph tests |
| Breadcrumbs | entry path | no language coupling | unchanged | already language-neutral | existing tests |
| Hover Preview | slug lookup | no language coupling | unchanged | already language-neutral | existing tests |
| Vault Heatmap | dates | aggregates every language | unchanged by design | a vault-wide activity aggregate; not a per-page listing | existing tests |
| SEO | entry language | already uses public location language | unchanged | already correct | existing SEO tests |

## Excluded plugins

The following plugins were reviewed and excluded because they do not select or
rank content entries, do not emit content listings, or operate only on the
current page or asset:

- Rendering/syntax: `alias`, `attachment`, `autocardlink`, `calculator`,
  `canvas`, `chartjs`, `citations`, `code-annotations`, `code-enhance`,
  `code-tabs`, `d2`, `diff`, `discord-embed`, `excalidraw`, `flashcards`,
  `frontmatter-transformer`, `gallery`, `graphviz`, `hard-breaks`, `highlight`,
  `icons`, `image-compare`, `image-optimizer`, `kanban`, `lightbox`, `map`,
  `markmap`, `marp`, `media`, `mermaid`, `mermaid-pele`, `meta-bind`,
  `obsidian-markdown`, `og-image`, `pdf`, `permalink`, `plantuml`,
  `properties`, `qr-code`, `quality`, `rename`, `responsive-image`,
  `rich-embed`, `share`, `shortcodes`, `sidenotes`, `source-files`,
  `svg-optimizer`, `text-fragment`, `toc`, `ux`, `vega-lite`, `wavedrom`,
  `webmention`.
- Infrastructure/operations: `analytics`, `deploy`, `diagnostics`,
  `article-metadata`, `daily-notes`, `excalibrain`, `query`, `recent-posts`
  (component), `core`, `honox`, `spa`, `theme` packages.

## Publication boundary

All changed listings continue to read `manifest.discoverableEntries` before any
locale selection. `selectLocalizedEntries` only filters entries that are already
discoverable, so `draft`, future `scheduled`, and `private` content cannot leak
through a locale path. `PublicContentView` remains the only browser-facing
view.

## Cache and incremental build

No new cache key was invented. Page types that depend on the whole entry set
keep `{ type: "global" }`, which is conservative but correct for translation
membership changes. Localization is part of `manifest.localization`, which is
included in the existing manifest fingerprint. There is no cross-locale output
reuse because each localized page has its own pathname and output descriptor.
