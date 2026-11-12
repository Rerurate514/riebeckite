# Declarative UI Architecture Implementation Audit

- Date: 2026-11-13
- Branch: `feat/declarative-ui-architecture-phase0-4`
- Base: `3e3a9b5a` (migration branch plus main `4977e308`), latest main merged as `d92a2f93` (`1b1ffbba`)
- Scope: all 85 plugins, plus `packages/core`, `packages/integrations/honox`, `packages/ui`, `packages/diagram`, `packages/runtime`, `packages/spa`, themes, and the scaffold
- Reference: [Declarative UI migration ledger](../declarative-ui-migration-2026-11/plan.md)

## Verdict

| Phase | Status | Evidence |
| --- | --- | --- |
| Phase 0: presence selectors | PASS | 19 client entries gained selectors; the four global entries are allowlisted; `pnpm check:client-entries` passes |
| Phase 1: resolved component props | PASS | `deferUntilManifest` finalizes props after manifest hooks with manifest/diagnostic context; `image-compare` is a deferred component |
| Phase 2: HAST components | PASS | `code-tabs` renders its tab markup through `CodeTabsGroup`; the official browser suite exercises the result |
| Phase 3: app placement | PASS | `AppSlot` exposes `head`, `bodyStart`, `articleAfter`, and `app`; the website uses `bodyStart`, and the existing lifecycle keeps one mount per page |
| Phase 4: shared external renderer lifecycle | PASS | Every external renderer now uses `renderPendingDiagrams`; Mermaid browser coverage passes |

No new fully declarative migration candidate was missed. The migration ledger is now 1 A, 17 B, 15 C, and 52 D: `image-compare` moved to VERIFIED and `code-tabs` moved from C to B.

## Phase 0

- `scripts/check_client_entry_presence.mjs` parses plugin `index.ts` files with the TypeScript AST and requires a seventh `presenceSelector` argument.
- The only entries without a selector are `analytics`, `color-mode`, `text-fragment`, and `ux`, which are intentionally global. `text-fragment` must observe selections on every article; `color-mode` and `ux` are page-level effects; `analytics` has no interactive UI.
- The check is available as `pnpm check:client-entries`.

## Phase 1

- `PluginMarkdownComponent` accepts `resolveProps(props, { sourceSlug, resolveAssetUrl, manifest, diagnostics })`.
- `deferUntilManifest` emits a base64-encoded deferred marker instead of rendering during the Markdown pass. The encoded props avoid HTML attribute escaping changing the JSON.
- `finalizeDeferredPluginComponents` runs after manifest hooks and before `synchronizeHtml`, decodes props, resolves them with the manifest context, and replaces the marker with the rendered component.
- Component errors use `renderError` when defined, so `image-compare` keeps its accessible error block and `image-compare-invalid` diagnostics.
- `image-compare` now registers the deferred `ImageCompare` component and no longer uses the `onManifestCreated` placeholder replacement. Its pointer/range controller remains.
- Core tests cover manifest context, diagnostics, and deferred rendering; image-compare's manifest handling tests pass unchanged.

## Phase 2

- `packages/core/src/plugin_component_hast.ts` registers `hastComponents` and `defineHastComponent`.
- HAST components run after the sanitizers and after plugin Rehype plugins, so they can consume generated UI while still receiving sanitized nodes.
- `code-tabs` registers `CodeTabs` and renders the tablist, panels, ARIA state, and labels through `CodeTabsGroup` with Hono JSX. The Rehype phase only groups the code blocks and provides the data.
- The package test builds a manifest with two tabbed fences and checks the rendered structure and code content. The official browser suite checks tab switching and panel visibility.

## Phase 3

- `packages/ui/src/overlay/index.tsx` provides `OverlayHost`, `findOverlayHost`, `AppSlot`, and `findAppSlot`.
- `AppSlot` supports `head`, `bodyStart`, `articleAfter`, and `app` names and an optional semantic element.
- The website renderer wraps the text-fragment overlay in the `bodyStart` slot. Existing `ClientLifecycle` behavior keeps one initializer per page/name/root, and UI tests cover SPA scroll restoration, focus, dialog, and drawer behavior.
- The text-fragment client uses the app-owned overlay host and removes only a host it created itself.

## Phase 4

- `packages/diagram/src/client.ts` centralizes pending-node discovery, `aria-busy`, lifecycle state, error handling, cleanup, and fallback opening. It accepts a custom selector and fallback selector.
- Migrated renderers: `graphviz`, `chartjs`, `mermaid`, `d2`, `wavedrom`, `vega-lite`, `markmap`, `map`, and `excalibrain`.
- Renderer-specific behavior such as Mermaid security, Vega finalization, Leaflet cleanup, WaveDrom skins, and Markmap asset loading remains inside each renderer callback.
- The Mermaid browser test covers rendering and SVG sanitization. The diagram tests cover selector handling, cleanup, and failure fallback.

## Final re-audit after the main merge

- The repository still contains 85 plugin directories and 32 plugins with `createClientEntry`.
- `pnpm check:client-entries` passes, so every non-global client entry is gated.
- Main added content-mutation and derived-view changes only; no plugin UI changed.
- The migration ledger now records 1 A, 17 B, 15 C, and 52 D. `image-compare` is VERIFIED in B, and `code-tabs` moved from C to B because it renders through a HAST component.
- B records keep declarative markup and browser effects separate.
- No assertions were deleted or weakened. The Mermaid browser expectation now also asserts the shared `data-diagram-status="rendered"` state. The Excalidraw browser test covers the public docs embed instead of the intentionally private `/assets/HW` route; standalone rendering remains covered by the Excalidraw page tests.

## Verification

| Check | Result |
| --- | --- |
| `pnpm test:e2e:external` | PASS; external site built from published artifacts |
| `node --import tsx --test tests/interactive-runtime/official.test.ts` | PASS 9/9 |
| `pnpm --filter @riebeckite/web build` | PASS; 1,042 pages |
| `pnpm typecheck` | PASS; 3 projects |
| `pnpm check` | PASS; 1,818 files |
| `pnpm check:packages` | PASS; 117 packages |
| `pnpm check:docs` | PASS |
| `pnpm check:client-entries` | PASS |
| `pnpm --filter @riebeckite/core test` | PASS 565/565 |
| `pnpm --filter @riebeckite/node test` | PASS 92/92 |
| `pnpm --filter @riebeckite/plugin-image-compare test` | PASS 13/13 |
| `pnpm --filter @riebeckite/plugin-code-tabs test` | PASS 2/2 |
| `pnpm --filter @riebeckite/plugin-search test` | PASS 32/32 |
| `pnpm --filter @riebeckite/plugin-mdx test` | PASS 11/11 |
| UI tests | PASS 13/13 |
| Diagram tests | PASS 8/8 |
| Mermaid tests | PASS 17/17 |
| Text-fragment tests | PASS 21/21 |
| Changelog tests | PASS 9/9 |

The Graphviz package has no test files of its own; the shared lifecycle is covered by `packages/diagram/test/client.test.ts`. A workspace-wide `pnpm test` was not run; the packages affected by this branch and the merge were tested individually.

## Remaining work

Phase 1-4 have no remaining implementation item. Optional follow-up: run the complete workspace test suite and add browser coverage for external renderers other than Mermaid and Graphviz.

## Merge readiness

All verification gates pass on the final branch, including the external scaffold E2E, the 9-case official browser suite, and the 1,042-page website build. Phase 0-4 are complete on this branch. Merge, push, and deploy were intentionally not performed and remain the reviewer's decision.
