# Declarative UI Migration Ledger

- Started: 2026-11-12
- Branch: `feat/declarative-ui-migration`
- Base commit: `5c7d41fc` (merge of `feat/mdx-plugin`; includes `810acafd`)
- Worktree: `C:/Users/rerur/.wk/program/riebeckite-declarative-ui`
- Owner: orchestration agent
- Scope: `packages/plugins/` (85 plugins), then `packages/ui`, `packages/runtime`, `packages/integrations/honox`, `packages/spa`, `packages/diagram`, Themes, and the official scaffold.

This ledger is the source of truth for audit status, decisions, verification, and the next action. Update it after every audit, implementation, and verification step.

## Status vocabulary

`NOT_AUDITED`, `AUDITED`, `MIGRATION_REQUIRED`, `IN_PROGRESS`, `IMPLEMENTED`, `VERIFIED`, `KEEP_IMPERATIVE`, `NOT_APPLICABLE`, `BLOCKED`, `UNVERIFIED`.

## Classification vocabulary

- **A —Full declarative migration**: JSX and component state can own the UI naturally.
- **B —Hybrid migration**: the UI can move to JSX, but browser APIs (positioning, pointer capture, size measurement, focus, fetch) stay imperative.
- **C —Keep imperative**: JSX would add complexity, cost, or runtime weight, or the operation is inherently imperative.
- **D —Not applicable**: build-time AST/data/server work, or already-declarative SSR with no client DOM ownership.

## Audit method

1. Inventory every plugin's plugin contract (`renderers`, `pageTypes`, `components`, `clientEntries`, `extendMarkdownPipeline`, `extendHtmlPipeline`).
2. Count DOM API use in non-test, non-dist sources (`querySelector`, `createElement`, `replaceChildren`, `innerHTML`, `addEventListener`, `MutationObserver`, `classList`, `setAttribute`, `textContent`, `dataset`, canvas/SVG).
3. Read each non-trivial client module and decide who owns rendering and state.
4. Measure the baseline, migrate, then re-audit.

## Classification summary

### A —Full declarative migration

| Plugin | Status | Owner | Reason |
| --- | --- | --- | --- |
| `flashcards` | VERIFIED | primary | The deck UI was created entirely in the client (`createDeckUi`, 7 `createElement`) with a small state machine (`position`, `revealed`, `order`). `FlashcardsDeck` now owns that state with Hono JSX `useState`; the client only mounts it and keeps payload parsing/fallback. |

### B —Hybrid migration

| Plugin | Status | Owner | Declarative part | Imperative part |
| --- | --- | --- | --- | --- |
| `search` | VERIFIED | primary | Result list rendering through `SearchResults` | Dialog controller, keyboard navigation, focus, fetch, `AbortSignal` |
| `lightbox` | VERIFIED | primary | Dialog markup and image/caption/status state through `LightboxDialog` | `<dialog>` controller, focus trap, image load events |
| `text-fragment` | VERIFIED | primary | Popover markup and action/status state through `TextFragmentPopover` | Selection reading, range geometry, copy timers, containment checks, event cleanup |
| `code-enhance` | VERIFIED | previous work | `CodeCopy` is a declarative Plugin Component with `useState` | Wrap/collapse toggles remain on AST-generated blocks |
| `image-compare` | KEEP_IMPERATIVE | primary | —| Pointer capture, range input, CSS custom property. `resolveProps` now exists, but it runs during the Markdown pass before manifest assets are final, so this plugin still uses its placeholder and `onManifestCreated` hook |
| `calculator` | KEEP_IMPERATIVE | primary | —| The isolated runtime already owns computation; UI is static SSR, so JSX state would add nothing |
| `toc` | KEEP_IMPERATIVE | primary | SSR `TableOfContents` JSX | Scroll spy and active-heading mutation |
| `color-mode` | KEEP_IMPERATIVE | primary | SSR toggle components | Attribute/localStorage/`matchMedia` synchronization |
| `navigation` | KEEP_IMPERATIVE | primary | SSR `SiteNav`/`SidebarNavigation` JSX | Responsive drawer and focus behavior |
| `docs` | KEEP_IMPERATIVE | primary | SSR `DocsSidebar` JSX | Scroll/active-section enhancement |
| `source-files` | KEEP_IMPERATIVE | primary | SSR page + renderer | File-tree interaction |
| `share` | KEEP_IMPERATIVE | primary | SSR `ShareControls` JSX | `navigator.share`/clipboard/focus |
| `analytics` | KEEP_IMPERATIVE | primary | —| Page-view bookkeeping only; no UI to render |
| `diff` | VERIFIED | primary | Diff panel and lines through `DiffPanel`/`DiffLine`; server output uses the same component | Fetching, select/commit state, loading controller |
| `garden-explorer` | KEEP_IMPERATIVE | primary | Page and client already hydrate Hono JSX | Search/filter state over hydrated page |
| `local-graph` | KEEP_IMPERATIVE | primary | Client already uses `hydrateRoot` with Hono JSX | SVG layout/measurement |

### C —Keep imperative

| Plugins | Reason |
| --- | --- |
| `code-tabs` | Tabs are produced by the Markdown/HAST pipeline and are already accessible through `@riebeckite/ui/tabs`; JSX would duplicate SSR markup and risk hydration drift without simplifying state. |
| `hover-preview` | The preview body is two text nodes; the expensive parts are fetch, hover/focus scheduling, and viewport positioning. Adding a JSX runtime to every page would be a net cost. |
| `autocardlink` | Cards are server-rendered by the remark plugin; the client only handles image fallback and a copy label. |
| `ux` | Reading progress and back-to-top update a CSS variable/class per animation frame; direct mutation is the efficient form and the elements are trivial. |
| `canvas` | Canvas editor owns drawing, selection, and pointer state. |
| `d2`, `graphviz`, `mermaid`, `wavedrom`, `vega-lite`, `markmap`, `chartjs` | External renderers own SVG/Canvas/DOM output and lifecycle. |
| `map` | MapLibre owns the map canvas, interaction, and DOM. |
| `marp` | Marp owns slide rendering; the client creates four controls and must toggle slide visibility imperatively. JSX would add runtime cost without simplifying that state. |
| `meta-bind` | Inputs and bindings are enhanced in place; the DOM contract is the feature. |
| `excalibrain` | SVG graph layout and interaction. |

### D —Not applicable (no client DOM ownership)

`alias`, `archive`, `article-metadata`, `attachment`, `backlinks`, `bases`, `breadcrumbs`, `changelog`, `citations`, `code-annotations`, `daily-notes`, `dataview`, `deploy`, `diagnostics`, `discord-embed`, `excalidraw`, `folder-pages`, `frontmatter-transformer`, `gallery`, `glossary`, `hard-breaks`, `highlight`, `icons`, `image-optimizer`, `kanban`, `l10n`, `media`, `mermaid-pele`, `mdx`, `obsidian-markdown`, `og-image`, `pdf`, `permalink`, `plantuml`, `properties`, `qr-code`, `quality`, `query`, `recent-posts`, `related-posts`, `rename`, `responsive-image`, `rich-embed`, `seo`, `series`, `shortcodes`, `sidenotes`, `svg-optimizer`, `taxonomy`, `timeline`, `vault-heatmap`, `webmention`.

## Migration queue

| Order | Plugin | Class | Work | Status | Tests |
| --- | --- | --- | --- | --- | --- |
| 1 | `flashcards` | A | Move deck rendering to a Hono JSX component with `useState`; keep payload parsing and fallback | VERIFIED | `pnpm --filter @riebeckite/plugin-flashcards test` (2/2); `tests/interactive-runtime/official.test.ts` flashcards + SPA cases pass |
| 2 | `search` | B | Render results with a JSX component; keep dialog/keyboard/fetch imperative | VERIFIED | `pnpm --filter @riebeckite/plugin-search test` (31/31); `test:browser` (18/18) |
| 3 | `lightbox` | B | Render dialog markup from JSX; keep dialog controller | VERIFIED | `pnpm --filter @riebeckite/plugin-lightbox test` (6/6); `tests/interactive-runtime/official.test.ts` lightbox case passes |
| 4 | `text-fragment` | B | Render popover from JSX; keep selection/position logic | VERIFIED | `pnpm --filter @riebeckite/plugin-text-fragment test` (21/21); `tests/interactive-runtime/official.test.ts` text-fragment case passes |
| 5 | `diff` | B | Render history diff panel/lines through Hono JSX; keep fetch and revision selection imperative | VERIFIED | `pnpm --filter @riebeckite/plugin-diff test` (18/18); `test:browser` (1/1) |
| 6 | Re-audit | — | Re-scan all plugins and dependent packages | VERIFIED | 85 plugins classified: 1 A, 16 B, 16 C, 52 D; no remaining A/B candidate |

## Baseline

| Item | Before | After |
| --- | --- | --- |
| `flashcards` package client (`dist/client.js`, unminified) | 6,126 B | 6,440 B (+314 B) |
| Website flashcards client chunk | Loaded on every page (`client-Dbl1HkEF.js`, 125,439 B) | Lazy chunk (`client-DySzhhlf.js`, 2,959 B) plus the shared JSX client runtime already used by Plugin Components |
| `flashcards` DOM construction in source | 7 `createElement` calls building the deck | 0; JSX owns markup and state |
| Interactive Plugin Component hydration | Broken when any runtime entry exists (missing `runtimeIds` argument) | Fixed, covered by a generated-client test, and confirmed by the external scaffold E2E |
| `search` package client (`dist/client.js`, unminified) | 13,284 B | 13,577 B (+293 B) |
| `search` result markup in source | 27 DOM construction/mutation calls (`createElement`, `appendChild`, `replaceChildren`, `setAttribute`, `innerHTML`, text nodes) | 0; `SearchResults` renders anchors, highlights, tags, and icons |
| Search client loading | Shared client chunk on every page (`client-Dbl1HkEF.js`, 125,439 B) | `[data-search-root]` presence selector; `client-D9tNpf5I.js` (6,565 B) on pages with the search bar |
| `lightbox` package client (`dist/client.js`, unminified) | 5,326 B | 5,600 B (+274 B) |
| `lightbox` dialog construction in source | 7 `createElement` calls in `dialog.ts` | 1 host `createElement`; `LightboxDialog` renders the rest through Hono JSX |
| Lightbox client loading | Shared client chunk on every page (`client-Dbl1HkEF.js`, 125,439 B) | `[data-lightbox-src]` presence selector; `client-sw_U6mX4.js` (2,921 B) on pages with image triggers |
| `text-fragment` package client (`dist/client.js`, unminified) | 8,391 B | 9,292 B (+901 B) |
| `text-fragment` popover construction in source | 4 `createElement` call sites in `text-fragment.client.ts` | 1 host `createElement`; `TextFragmentPopover` renders the rest through Hono JSX |
| Text-fragment client loading | Shared client chunk (`client-Dbl1HkEF.js`, 125,439 B) | Global by design; the component lives in the shared `client-Bh6h2XFk.js` (91,733 B) because selection sharing must work on every article |
| `diff` package client (`dist/client.js`, unminified) | 7,116 B | 8,010 B (+894 B) |
| `diff` panel rendering | `innerHTML` with a string builder and `escapeHtml` on every revision change | `createRoot`/`DiffPanel` renders the table; the same component also produces the server HTML |
| `diff` client cleanup | No cleanup; listeners survived remounts | `AbortController` and `panelView.unmount()` returned through `initDiffHistory` |
| Diff client loading | Shared client chunk on every page | `[data-rr-diff-history]` presence selector |


`flashcards` markup is now server-renderable through `FlashcardsDeck`, but the existing `flashcards` fence still renders a payload and hydrates on the client, so no content migration is required.

## Findings and risks

- No prior declarative-UI audit exists; only `code-enhance` uses `definePluginComponent`.
- Plugin Components are registered from `riebeckite-component` fences with YAML props. Existing Markdown syntaxes (for example the `flashcards` fence) cannot use that registry without a breaking content change, so client-side JSX rendering is the compatible path.
- `clientEntries` without `presenceSelector` import their module on every page. New work should gate optional widgets with a selector.
- Hono JSX renders a boolean `true` as an empty attribute and omits `false`; ARIA state attributes such as `aria-pressed` must be explicit strings.
- The generated client called `mountPluginClientInitializer` for Plugin Components without the `runtimeIds` argument. Any site with a runtime entry therefore failed to hydrate every interactive component. Fixed in `packages/integrations/honox/src/client_module.ts` and covered by a regression test.
- `the excalidraw figure renders to SVG in the browser` incorrectly expected `/assets/HW`, but `docs/assets/HW.md` is intentionally `private: true`, so no standalone page is generated. The browser test now checks the public docs embed, and `packages/plugins/excalidraw/test/excalidraw_page.test.ts` covers standalone page rendering.
- `loadStandaloneSsgBundle` imported the built entry with a `?v=<timestamp>` query, while dynamically loaded content-renderer chunks imported the same entry without the query. Node loaded two module instances with separate Hono JSX runtimes, so MDX nodes failed `instanceof` checks during full regeneration. The loader now uses the stable file URL; a regression test covers the URL contract.
- Search result markup now renders through Hono JSX. Keyboard selection updates a prop and re-renders the same root instead of mutating `aria-selected` on existing anchors; `scrollIntoView` remains the only imperative read after render.
- `dangerouslySetInnerHTML` is used only for `result.icon.html`, matching the previous `innerHTML` trust boundary for sanitized content icons.
- The lightbox dialog is rendered by `createRoot` into a host element that is appended to `document.body`; the native `<dialog>` controller, focus trap, and image load events stay imperative. The browser test needs a cancelable click so the trigger anchor does not navigate.
- The text-fragment popover is also rendered by `createRoot` into a host element appended to `document.body`. `render()` is asynchronous, so positioning runs in `requestAnimationFrame` after the visible state has been applied; selection reading, copy timers, and event cleanup stay imperative.
- The first audit treated `diff` as "already Hono JSX" because its renderer files use `.tsx`, but `renderDiffPanel`/`renderDiffLine` returned template strings and the client wrote the panel with `innerHTML`. The re-audit corrected this: `DiffPanel`/`DiffLine` are real JSX components, and the client uses `createRoot`.
- `diff` had no SPA cleanup. The mount now returns a cleanup that aborts its listeners and unmounts the panel root; the package browser test covers both rendering and cleanup.
- Docs require paired English/Japanese files and reachability from `docs/README.md`; this ledger has a Japanese companion and a README link.

## Completion audit

- Migration scope is complete: every plugin is classified, all A work is verified, the B parts worth moving are verified, and the remaining C/D decisions are recorded above.
- No unclassified `createClientEntry` user remains, and the re-audit found no new A/B candidate.
- External scaffold E2E passes. `pnpm test:e2e:external` builds the official external site from published tarballs and ends with `[external-site] PASS: external site built from published artifacts`. The previous `TypeError: Cannot convert object to primitive value` was a product bug in `packages/integrations/honox/src/ssg/standalone.ts`: the cache-busting query created a second module instance of the SSG entry and therefore a second Hono JSX runtime. It reproduced on main `16baeffe` with `RIEBECKITE_SSG_FULL_REGENERATION=1`, where MDX content renderers are loaded dynamically. The stable module URL fix makes the external E2E pass and also confirms interactive Plugin Component hydration on the scaffold.
- `the excalidraw figure renders to SVG in the browser` passes after correcting the test's invalid `/assets/HW` expectation. Private content is correctly excluded from standalone routes; the docs embed and the plugin's own standalone-page tests cover the behavior.
- Final re-audit after merging main `4977e308` and the later content-mutation commits: 85 plugins, 32 client entries, and the same 1 A / 16 B / 16 C / 52 D classification. No new A/B candidate was found. The Phase 0-4 architecture status and remaining gaps are recorded in the [implementation audit](../declarative-ui-architecture-2026-11/implementation.md).

## Next action

No migration candidate remains, and all verification gates pass, including the external scaffold E2E and the official browser interaction suite. The architecture phases are not all complete: Phase 1 needs manifest-finalized props, Phase 2 has no production consumer, Phase 3 needs app slots and the one-mount/SPA contract, and Phase 4 still has eight renderers on private loops. The branch is ready for review; it has not been merged, pushed, or deployed.

