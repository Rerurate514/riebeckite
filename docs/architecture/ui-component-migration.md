---
title: UI Component Migration
---
# UI Component Migration

## 1. Status and decision

**Phase 4 complete: the legacy Slot API (`ContentSlot`, `bodySlots`, `ARTICLE_SLOT`, `appendContentBodySlot`, `hasSlot`) has been removed and plugins expose data helpers + JSX components composed by the Site.** This document is the design baseline for the removal. Phase 0 changes documentation only; it changes no runtime behaviour and provides no compatibility layer. Later phases must remove `ContentSlot`, `bodySlots`, `ARTICLE_SLOT`, and `appendContentBodySlot` rather than preserve them behind another API.

## 2. Scope and non-goals

The destination is a site-composed UI: plugins export typed data helpers and
components; the site chooses whether, where, and how often to render them. This
does not replace Markdown processing, plugin page types, assets, endpoints, or
head tags. It also does not make every existing HTML page type JSX in the first
migration.

## 3. Current-state audit

`ContentManifestEntry.bodySlots` is a string map. `appendContentBodySlot` appends
HTML fragments, and `ContentSlot` injects the selected fragment with
`dangerouslySetInnerHTML`. `apps/web/app/components/article/article.tsx` renders
the conventional header, metadata, aside, before-content, after-content, and
footer positions. Plugins therefore choose the site DOM position while preparing
the manifest.

The audit found no stylesheet selector relying on `[data-slot]`; it is primarily
a DOM hook. The coupling is nevertheless real: `ArticleLayout` and integration
CSS provide a fixed grid and the app uses the same `data-article-layout` state.

## 4. Target component model

Each UI-capable plugin exposes three independent surfaces:

1. A server-safe query/helper returning a narrow immutable model.
2. A typed JSX component that accepts that model or narrow props.
3. Optional component-internal CSS and an explicitly declared client entry.

Factories retain pipeline, asset, endpoint, diagnostic, head-tag, and dependency
registration. They must not render JSX to a string or mutate an entry to place
UI. A component must return `null` for empty data. The site can render it zero,
one, or multiple times; duplicate prevention is a site concern unless duplicate
DOM IDs make it a component-level correctness rule.

```tsx
const backlinks = getBacklinks(view, entry.slug)
return <Backlinks items={backlinks} />
```

Server helpers and components must not import browser-only code. Browser code is
registered as a client entry and receives only its component's rendered DOM/data.
Disabling a factory removes its capability; omitting a component only removes its
placement.

## 5. PublicContentView is the UI boundary

Public components receive `PublicContentView`, not `ContentManifest`. The name
means published-safe data, rather than merely a TypeScript view. It is built as
new, filtered maps and graphs, not as a type cast over raw maps.

| Contract | Includes | May reveal |
| --- | --- | --- |
| `routableEntries` | public and unlisted | only their own routable page |
| `discoverableEntries` | public | lists, navigation, tags, graph neighbours |
| `findRoutableBySlug` / aliases | routable target | explicit links, including unlisted |
| `findDiscoverableBySlug` | public target | discovery UI only |
| tags, graph, backlinks, related, docs navigation | discoverable records only | public relationships only |

Draft and private entries, and their titles, slugs, permalinks, aliases, tags and
relations, are absent. An unlisted entry may be resolved when an already public
entry explicitly links to it, but must not enter indexes, related lists,
backlinks, tags, documentation navigation, or graph discovery. The current
routable entry may be rendered on its own route. Properties use routable link
resolution and render plain text when the target is not routable.

Translations follow the same rule: a route can expose safe alternatives for its
translation group; discovery lists expose only discoverable translations. The
facade must offer dedicated methods such as `getBacklinks`, `getRelated`, and
`getTranslations`, rather than raw indexes.

## 6. HTML and body boundary

Markdown remains pipeline-produced `entry.html` and is rendered by
`ArticleBody`. `PageBody` remains the boundary for legacy/generated
`PluginPageType` HTML. A possible low-level `HtmlFragment` is server-only and
accepts only `{ html, source: "markdown" | "plugin-page" }`; it is not a general
plugin UI escape hatch. New article-external UI is JSX. Neither browser input nor
an arbitrary plugin string may reach raw injection without an owning trusted
pipeline.

## 7. Ownership and CSS contract

| Owner | Owns | Must not own |
| --- | --- | --- |
| Core | content contracts and filtered public view | HonoX or site layout |
| HonoX integration | semantic primitives and HTML boundaries | article grid or placement policy |
| Plugin | model, component internals, assets, runtime | page shell, rail, sticky position |
| Theme | tokens, typography, colours, element styling | structural layout choice |
| Site | TSX composition, grid, responsive rules, sticky rails | reusable plugin capability |

Remove integration layout CSS for `.rb-article-layout` and `.rb-page-body`, and
remove `articleLayout` / `data-article-layout` as a layout controller. Preserve
stable semantic hooks such as `.rb-article-content`, header, metadata, and footer
for typography. The TOC currently violates the target by owning grid columns,
negative margins, and sticky rules; retain only its internal presentation. Docs
plugin CSS is already mostly internal. The twelve Slot plugins otherwise have no
global placement CSS. `sidenotes` is not a Slot plugin but has sticky behaviour;
review it separately under the same ownership policy.

## 8. Site composition examples

The site, not a preset or plugin, controls layout.

```tsx
// Minimal: one reading column
<Article><ArticleHeader entry={entry} /><ArticleBody html={entry.html} /></Article>

// Starter: explicit supplementary content
<Article class="article"><ArticleHeader entry={entry} /><Properties entry={entry} view={view} />
  <ArticleBody html={entry.html} /><ShareControls entry={entry} />
  <Backlinks items={getBacklinks(view, entry.slug)} />
</Article>

// Showcase: a site-owned rail
<main class="article-shell"><article><ArticleBody html={entry.html} /><RelatedPosts items={related} /></article>
  <aside class="article-rail"><TableOfContents items={toc} /><DocsSidebar navigation={docs} /></aside>
</main>
```

```css
.article-shell { display: grid; grid-template-columns: minmax(0, 46rem) 18rem; gap: 3rem; }
.article-rail { position: sticky; top: 1.5rem; align-self: start; }
@media (max-width: 52rem) { .article-shell { display: block; } .article-rail { position: static; } }
```

Minimal owns no rail. Starter can choose a flow layout. Showcase owns the grid,
breakpoint and sticky behaviour. Plugin styles may style their own controls but
must not assume any of these wrappers.

## 9. HonoX primitives and exports

Keep `Article`, `ArticleHeader`, `ArticleContent`, `ArticleBody`, `PageBody`,
`ArticleFooter`, `Sidebar`, and `ThemeRoot` as semantic primitives, after removing
Slot APIs and placement attributes. Components belong in plugin packages and are
exported from their public entry points with their model types and helpers. Site
TSX belongs under the application's `app/`. HonoX owns rendering primitives only;
it does not collect plugin components or select their order.

## 10. Plugin migration matrix

| Plugin | Target API and site use | Keep / remove |
| --- | --- | --- |
| backlinks | `getBacklinks(view, slug)`, `<Backlinks>` | keep graph/assets; remove `render` and footer hook |
| breadcrumbs | `getBreadcrumbs(view, entry)`, `<Breadcrumbs>` | keep JSON-LD head hook; remove header insertion |
| changelog | async `getChangelog(view, entry)`, `<Changelog>` | keep Git dependency/diagnostics; remove after-content hook |
| diff | `getPostDiff(entry)`, `<PostDiff>` | keep history API/runtime; split capability from former `ui.enabled` |
| docs | `getDocsNavigation`, `getDocsPrevNext`, `<DocsSidebar>`, `<DocsPrevNext>` | keep navigation data/client internals; remove aside/footer insertion |
| l10n | `getLocalization(view, entry)`, `<LanguageSwitcher>` | keep route transforms and alternate head tags; remove `ui.slot` and render callback |
| local-graph | `getLocalGraph(view, slug)`, `<LocalGraph>` | keep assets/runtime; remove `render` hook |
| properties | `getProperties(view, entry)`, `<Properties>` | use safe links; remove metadata insertion |
| related-posts | `getRelatedPosts(view, entry)`, `<RelatedPosts>` | keep ranking options; remove `render` hook |
| series | `getSeriesNavigation(view, entry)`, `<SeriesNavigation>` | retain list/index page types; remove footer insertion |
| share | `getShareLinks({ entry, site })`, `<ShareControls>` | keep services/copy runtime; remove `placement` |
| webmention | `getWebmentionsForEntry(entry)`, `<WebmentionSection>` | keep endpoint, storage, verification; remove `render` hook |

All helpers return an empty model or collection, never Slot HTML. Components have
empty-state behaviour defined by their package: normally `null`; webmentions may
show an intentional empty affordance. Configuration keeps feature semantics
(labels, ranking, providers, navigation source) and loses placement semantics.

## 11. Plugin-specific visibility rules

Backlinks, related posts, local graph, series, docs navigation, and tag-derived
breadcrumbs use discoverable data. Properties can resolve an explicit routable
unlisted target but never a non-routable target. L10n alternatives are filtered
by the route's safe group contract. Changelog and diff concern the current
routable entry only. Webmentions and share operate on that entry and do not need
manifest-wide discovery.

## 12. Factory, configuration, and dependencies

Factory registration stays necessary for non-UI work. `breadcrumbs.jsonLd`, l10n
alternate links, diff history endpoints, webmention verification, assets, and
client entries remain factory concerns. Delete `render`, `placement`, arbitrary
`slot`, and HTML callback options that mean automatic placement. Do not reinterpret
them as hidden defaults.

Diff history retrieval and generation require an explicit capability opt-in.
Installing a Diff component or placing it in a Site does not enable history I/O.
The existing history behaviour remains unchanged until its Phase 2 API migration.

Webmention external build dependencies require an explicit static-snapshot
capability opt-in. Rendering a component reads an already available snapshot and
does not perform external I/O. Snapshot refresh and UI placement remain separate;
the existing Webmention behaviour remains unchanged until Phase 2.

Docs uses a navigation-source contract for navigation data generation.
`sidebar.auto` and `prevNext` do not express or imply placement. Sidebar and
Prev/Next remain independent components in the target model, while existing Docs
rendering remains unchanged until Phase 2.

## 12.1 Foundation APIs

`createPublicContentView(manifest)` produces a new, frozen public-data facade for
each manifest state. It exposes `routableEntries`, `discoverableEntries`,
`findRoutableBySlug`, `findDiscoverableBySlug`, `findRoutableByAlias`,
`getDiscoverableEntriesByTag`, and discoverable graph relationship methods. It
copies routable records, filters links to non-routable targets, and rebuilds
aliases, tags, and graph results from the filtered records. It does not expose
raw manifest maps or graphs. There is intentionally no cross-manifest memoization,
so a publishing-state change cannot reuse a stale view.

`HtmlFragment` is a server-only HonoX primitive:

```tsx
<HtmlFragment html={html} source="markdown" />
```

It emits no wrapper. Its `source` field declares provenance; it is not runtime
sanitization or a security guarantee. `ArticleBody` and `PageBody` remain the
semantic boundaries for Markdown and Plugin Page HTML. It does not sanitize HTML:
Markdown raw HTML, rehype/remark output, Plugin Page HTML, and any external-data-
derived HTML must be trusted and sanitized by their owning pipeline before this
boundary. New Plugin UI must use JSX rather than this primitive.

Plugin packages may export a `PluginDataHelper<Input, Model>` and a
`PluginComponent<Props>` in addition to their factory. Helpers receive narrow
inputs such as `PublicContentView`; components receive readonly typed props and
return no Slot HTML. Package exports may additionally expose `./components`,
`./style.css`, and `./client` where applicable. Existing asset and client-entry
registration remains factory-owned; importing a component alone neither registers
CSS/client runtime nor enables a plugin capability. Existing package `sideEffects`
metadata remains the source of CSS tree-shaking behaviour.

## 13. Cache and incremental SSG impact

Today manifest-hook cache serializes raw entries and fingerprints derived public
and discoverable collections, generated data, assets, client entries and
diagnostics. Slot removal eliminates generated `bodySlots` data and the twelve
rendering hooks; cache schema/version and pipeline fingerprints must change so an
old snapshot cannot be reused.

`computeAppFingerprint` hashes `app/` and configuration. Therefore a site TSX or
CSS placement change invalidates the no-change incremental SSG path; no special
placement dependency is needed. Plugin enablement/configuration is covered too.
Global content dependencies still invalidate broadly until separately refined.
Phase 1 must verify both cold and persistent-cache builds, changed-content builds,
and a placement-only app edit.

## 14. Migration order and tests

1. Add `PublicContentView` and tests proving filtered maps cannot reveal private
   fields or relations.
2. Add component/query exports while keeping current Slot implementation only
   until all site consumers have moved in the same breaking release.
3. Convert the site and presets to explicit TSX/CSS composition.
4. Convert the twelve plugins, preserving non-UI hooks and page types.
5. Remove Slot contracts, primitives, CSS, tests, and configuration fields in one
   breaking change; do not ship a compatibility adapter.

Tests cover helper visibility, empty rendering, client-entry registration,
non-placement factory work, public/unlisted/draft matrices, duplicate site use,
desktop/mobile site layouts, and cache invalidation. Each converted plugin needs
a component unit test and a site integration fixture.

## 15. Phase 2 entry criteria

Phase 2 may start after the foundation API tests, HonoX primitive test, cache and
incremental SSG regression checks, typecheck, Biome, and documentation checks
pass; existing Slot rendering must remain intact. It may then migrate one Plugin
API at a time without changing the capability decisions above.

## 16. Cache and SSG verification

**Phase 3 result:** Minimal, Starter, and Showcase presets compose article UI
directly in Site TSX. Starter and Showcase place plugin components around
`ArticleBody` and own their responsive Grid and table-of-contents sticky
behaviour in Site CSS. The legacy Slot API remains available for existing
consumers until Phase 4, but presets neither consume Slot data nor duplicate
their direct component UI through factory placement. Factory capability work,
including assets, client entries, JSON-LD, routes, and endpoints, remains
unchanged.

Phase 4 may remove the legacy Slot contracts only after every non-preset Site
consumer has completed the same migration.

The foundation APIs do not alter cache schemas, pipeline fingerprints, output
dependencies, plugin fingerprints, or Slot HTML. `PublicContentView` is derived
from the current manifest and has no persistent cache. `HtmlFragment` changes
only SSR HTML rendering. Existing `computeAppFingerprint` continues to invalidate
SSG output for `app/` TSX or CSS changes. Phase 1 verification records cold,
no-change, content, publication, layout-only, and Plugin-data coverage using
existing small fixtures; it does not run the 10,000-entry benchmark.

**Phase 1 result:** the Core and HonoX integration suites passed, including
persistent-content and manifest-hook cache, publication-state, output-dependency,
cold/no-change/content-edit/app-change, and plugin configuration coverage. No
cache schema or fingerprint change is required for these additive APIs.
