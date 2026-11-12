# Declarative UI Architecture Implementation Ledger

- Started: 2026-11-12
- Branch: `feat/declarative-ui-completion`
- Base: `feat/declarative-ui-architecture-phase0-4` (`d55c0e12`)
- Worktree: `C:/Users/rerur/.wk/program/riebeckite-declarative-ui-completion`
- Goal: remove the Plugin API constraints so dialogue UI, AST-derived UI, data-dependent UI and external-renderer UI can be implemented declaratively
- References: `docs/audits/declarative-ui-architecture-2026-11/report.md` (audit branch), `docs/audits/declarative-ui-migration-2026-11/plan.md`, `tests/declarative-ui-poc/`
- Forbidden: merging into main, push, PR creation, deploy, `reset --hard`, discarding uncommitted changes, destroying existing worktrees

This ledger lets a compressed or interrupted session resume from the file and the Git history. When the audit and the code disagree, the code wins.

## Status

`PLANNED` / `INVESTIGATING` / `IMPLEMENTING` / `VERIFYING` / `COMPLETE` / `SKIPPED_WITH_REASON` / `BLOCKED`

## Principles

- Use JSX where it fits: small UIs with interactive state and external-renderer lifecycles
- Keep SSR HTML plus small behavior controllers where that is better: code blocks, diagrams, navigation
- Do not replace the Canvas/SVG/DOM rendering inside external libraries
- Separate browser side effects (pointer, measurement, scroll, focus, fetch) from rendering responsibility
- Do not add a new UI runtime
- Do not load the JSX runtime for simple UI (enforced by presenceSelector and chunk splitting)

---

## Phase 0 — Presence Selector Optimization

| Item | Detail |
| --- | --- |
| Status | VERIFYING |
| Targets | `presenceSelector` as the 7th `createClientEntry` argument, `scripts/check_client_entry_presence.mjs`, `pnpm check:client-entries` |
| Constraint | 23 of 32 client entries had no presenceSelector, so their modules loaded on pages without the UI |
| Packages | `packages/plugins/*` (19 plugins), `scripts/`, `packages/integrations/honox` (existing conditional mounting) |
| API changes | None (the existing 7th argument is now required) |
| Tests | Static `check:client-entries`; real-browser chunk loading verification (not complete) |
| Performance | Pages without the UI no longer load that plugin's client chunk |
| Commit | Not yet |
| State | Selectors added to 19 plugins; every selector was statically confirmed to match a server-rendered marker |
| Residual issues | Per-entry browser regression tests and before/after JS transfer figures are not complete |

### Applied selectors and markers

| Plugin | Selector | Marker source |
| --- | --- | --- |
| `autocardlink` | `.rr-cardlink` | remark |
| `canvas` | `[data-canvas]` | `src/render.ts` |
| `code-enhance` | `.rr-code, [data-code-copy]` | `copy_component` / rehype |
| `code-tabs` | `[data-code-tabs=true]` | `src/rehype.ts` |
| `d2` | `[data-d2=pending]` | rehype |
| `docs` | `[data-docs-sidebar]` | `src/render.ts` |
| `excalibrain` | `[data-excalibrain]` | `src/render.ts` |
| `graphviz` | `[data-graphviz=pending]` | rehype |
| `hover-preview` | `script[data-rb-hover-preview]` | `src/render.ts` |
| `map` | `[data-rr-map=pending]` | rehype |
| `markmap` | `[data-markmap=pending]` | rehype |
| `marp` | `figure[data-marp]` | `src/render.ts` |
| `mermaid` | `[data-mermaid=pending]` | rehype |
| `navigation` | `[data-sidebar-navigation]` | layout |
| `share` | `[data-rr-share]` | `share-controls.tsx` |
| `source-files` | `[data-source-file]` | page renderer |
| `toc` | `[data-toc-target]` | layout |
| `vega-lite` | `[data-vega-lite]` | rehype |
| `wavedrom` | `[data-wavedrom=pending]` | rehype |

### Entries left unconditional (site-wide features)

`analytics`, `color-mode`, `text-fragment` and `ux` must initialize regardless of UI presence, so they have no presenceSelector and are explicitly allowed by the check script.

### Decisions

- Entries whose UI is produced after page load still got a selector when the marker exists in SSR HTML
- We add no selector when the marker depends on client-side creation (none such; `canvas` also renders `[data-canvas]` during SSR)
- Selectors depend only on DOM presence; site-wide features still initialize unconditionally

---

## Phase 1 — Resolved Plugin Component Props

| Item | Detail |
| --- | --- |
| Status | VERIFYING |
| Targets | `PluginComponentResolveContext` and `resolveProps` (added on the base branch), `image-compare` reference implementation |
| Constraint | Component `render` ran before asset URLs were known, so props could not be resolved asynchronously |
| Packages | `packages/core`, `packages/plugins/image-compare` |
| API changes | `resolveProps(props, context)` (`context.sourceSlug`, `context.resolveAssetUrl`); resolved props are shared by SSR and hydration and serialized as JSON-safe data |
| Tests | `packages/core/test/plugin_component.test.ts`, `packages/plugins/image-compare/test/*` |
| Performance | Server-only rendering modules are separated from the client module, so the client chunk no longer pulls the server render chunk |
| Commit | Not yet |
| State | image-compare migrated to a Plugin Component; SSR HTML, pointer/range/keyboard/ARIA, both orientations and SPA unmount/remount are preserved |
| Residual issues | Real-browser hydration verification is not complete |

### Design

- `resolveProps` is the single asynchronous boundary before rendering
- Asset URLs are resolved through `context.resolveAssetUrl`, a pipeline-provided resolver rather than a declared string key
- Resolved props are embedded as JSON in `data-riebeckite-component-props`; SSR and hydration read the same values
- Dependencies are covered by the content and output HTML hashes. Manifest values that affect output are therefore part of the fingerprint
- Diagnostics are derived from the rendered `data-image-compare-error` marker, because the pipeline has no component-time diagnostics sink and processed-content cache hits must keep reporting the same diagnostics

### image-compare migration result

- Authoring syntax stays ```` ```image-compare ````; remark normalizes it to `riebeckite-component` with `ImageCompare`
- SSR: `figure.rr-image-compare`, static fallback, Before/After layers, range input, divider
- Declarative state: the comparison position lives in `useState` and is reflected through a CSS custom property
- Imperative code kept: pointer capture, `getBoundingClientRect` measurement, range synchronization, focus
- Errors: `rr-image-compare--error`, `role=status`, and the `data-image-compare-error` marker

---

## Phase 2 — External Renderer Declarative Wrapper

| Item | Detail |
| --- | --- |
| Status | VERIFYING |
| Targets | `@riebeckite/diagram/client` `renderPendingDiagrams`, `mermaid`, `graphviz`, `chartjs` |
| Constraint | Each renderer duplicated initialization, abort, disposal and error handling, and SPA cleanup was inconsistent |
| Packages | `packages/diagram`, `packages/plugins/mermaid`, `packages/plugins/graphviz`, `packages/plugins/chartjs` |
| API changes | `DiagramClientContext.selector`; `DiagramClientRenderer` may return `void`; `DiagramPluginDefinition.client.presenceSelector` is required |
| Tests | `packages/plugins/mermaid` (17), `packages/diagram` (8); `chartjs` and `graphviz` have no package tests |
| Performance | Library-level chunks are preserved and are not loaded on pages without the UI (presenceSelector) |
| Commit | Not yet |
| State | mermaid moved to the shared wrapper; graphviz root/signal propagation fixed; chartjs presenceSelector added |
| Residual issues | Real-browser SPA navigation and unmount disposal verification is not complete |

### Scope of the shared wrapper

- loading / ready / error are expressed through `data-diagram-status`, `aria-busy` and `[data-diagram-fallback]`
- Initialization is per component (figure); the cleanup returned by `renderPendingDiagrams` is called by the lifecycle
- `signal` aborts work and `isConnected` rejects DOM replaced by SPA navigation
- External SVG/Canvas rendering is not replaced
- The mermaid CDN loader and theme selection stay local (not bundled)

### Renderers not migrated

`d2`, `wavedrom`, `vega-lite`, `markmap`, `map` and `excalibrain` use their own `data-<kind>` status attributes, layout or disposal, and unifying them would change their markup. Since the wrapper is proven with Mermaid and Chart.js, we do not force unification. They can move later by passing a selector to `renderPendingDiagrams`.

---

## Phase 3 — HAST Component / Children API

| Item | Detail |
| --- | --- |
| Status | SKIPPED_WITH_REASON |
| Targets | None (PoC removed) |
| Constraint | Treat arbitrary Markdown AST nodes as components and pass children |
| Packages | `packages/core` (no public API added) |
| API changes | None |
| Tests | None |
| Performance | None |
| Commit | Not yet |
| State | Audited and prototyped; decided not to add a public API |
| Residual issues | None |

### Rationale

- The representative case, Code Tabs, groups consecutive sibling code blocks, which a single-node HAST component API cannot express
- The proof of concept never emitted `client` hydration attributes and never serialized props, so it was incomplete as a public API
- No real plugin consumed it, so the value of a generic API was not proven
- The current Code Tabs implementation (SSR HTML plus a small behavior controller) is better in both performance and maintainability, so there is no reason to move it to JSX

The unproven `hastComponents` surface was therefore removed, and only the design analysis and PoC result are recorded. The policy of keeping the sanitizer boundary (after rehypeSanitize) and avoiding DOM post-processing remains.

---

## Phase 4 — App Slots / Overlay Ownership

| Item | Detail |
| --- | --- |
| Status | VERIFYING |
| Targets | `@riebeckite/ui/overlay` `OverlayHost` / `findOverlayHost`, lightbox, text-fragment |
| Constraint | Overlays appended directly to `document.body`, leaving ownership, focus and cleanup unclear |
| Packages | `packages/ui`, `packages/plugins/lightbox`, `packages/plugins/text-fragment`, `website/app/routes/_renderer.tsx` |
| API changes | `OVERLAY_HOST_ATTRIBUTE`, `OverlayHost`, `findOverlayHost` |
| Tests | `packages/ui/test/overlay.test.tsx` (12), `packages/plugins/lightbox` (6) |
| Performance | The overlay host only renders an empty SSR container |
| Commit | Not yet |
| State | Two plugins use the app-provided host and fall back to their own host when it is absent |
| Residual issues | Browser verification of focus restoration and scroll locking with multiple overlays is not complete |

### Decisions

- No new slot contract. `head` / `bodyStart` / `articleAfter` are already covered by the HonoX layout
- Overlays declare ownership through a named `OverlayHost`
- lightbox removes only a host it created itself; an app-owned host is left in place
- With only two consumers, the contract is not widened further (no abstraction for its own sake)

---

## Phase 5 — Integration & Regression

| Item | Detail |
| --- | --- |
| Status | PLANNED |
| Targets | TypeScript, Biome, core/plugin/HonoX tests, SPA browser tests, scaffold golden tests, external scaffold E2E, distribution tarball install |
| Constraint | Cross-cutting regression coverage |
| Packages | Whole repository |
| API changes | None |
| Tests | Run the gates below and record the results |
| Performance | Compare bundle sizes before and after |
| Commit | Not yet |
| State | Not started |
| Residual issues | Isolate the known external SSG `TypeError: Cannot convert object to primitive value` and the Excalidraw private-asset browser failure |

---

## Phase 6 — Documentation

| Item | Detail |
| --- | --- |
| Status | PLANNED |
| Targets | `docs/docs/reference/plugin-api/ui-and-assets.md` and the Japanese counterpart |
| Constraint | Keep public documentation consistent with the implementation |
| Packages | `docs` |
| API changes | None |
| Tests | `pnpm check:docs`, `pnpm test:docs` |
| Performance | None |
| Commit | Not yet |
| State | Not started |
| Residual issues | Do not document PoC-only APIs as public APIs |

---

## Verification log

| Date | Target | Result |
| --- | --- | --- |
| 2026-11-12 | `@riebeckite/plugin-image-compare` tests | 14 pass |
| 2026-11-12 | `@riebeckite/plugin-mermaid` tests | 17 pass |
| 2026-11-12 | `@riebeckite/diagram` tests | 8 pass |
| 2026-11-12 | `packages/core/test/plugin_component.test.ts` | 2 pass |
| 2026-11-12 | `@riebeckite/ui` tests | 12 pass |
| 2026-11-12 | `@riebeckite/plugin-lightbox` tests | 6 pass |
| 2026-11-12 | `pnpm build:packages` | exit 0 |
| 2026-11-12 | `pnpm typecheck` | exit 0 |
