# Declarative UI Architecture Implementation Audit

- Date: 2026-11-13
- Branch: `feat/declarative-ui-architecture-phase0-4`
- Base: `3e3a9b5a` (migration branch plus main `4977e308`), latest main merged as `64603375` (`1567071a`)
- Scope: all 85 plugins, plus `packages/core`, `packages/integrations/honox`, `packages/ui`, `packages/diagram`, `packages/runtime`, `packages/spa`, themes, and the scaffold
- Reference: [Declarative UI migration ledger](../declarative-ui-migration-2026-11/plan.md)

## Verdict

| Phase | Status | Evidence |
| --- | --- | --- |
| Phase 0: presence selectors | PASS | 19 client entries gained selectors; the four global entries are allowlisted; `pnpm check:client-entries` passes |
| Phase 1: resolved component props | PARTIAL | `resolveProps` and asset resolution context pass core tests; resolution still happens during the Markdown pass, before manifest assets are final |
| Phase 2: HAST components | PARTIAL | The post-sanitize API and tests pass; no production plugin consumes it yet |
| Phase 3: app placement | PARTIAL | The overlay host and text-fragment integration pass; generic app slots and the one-mount/SPA focus contract are absent |
| Phase 4: shared external renderer lifecycle | PARTIAL | The shared selector lifecycle and Graphviz migration pass; eight renderers still use their own loops |

No new fully declarative migration candidate was found. The migration ledger remains 1 A, 16 B, 16 C, and 52 D for its 85 plugins. The remaining work is architecture completion, not a missed migration.

## Phase 0

- `scripts/check_client_entry_presence.mjs` parses plugin `index.ts` files with the TypeScript AST and requires a seventh `presenceSelector` argument.
- The only entries without a selector are `analytics`, `color-mode`, `text-fragment`, and `ux`, which are intentionally global. `text-fragment` must observe selections on every article; `color-mode` and `ux` are page-level effects; `analytics` has no interactive UI.
- The check is available as `pnpm check:client-entries`.

## Phase 1

- `PluginMarkdownComponent` accepts `resolveProps(props, { sourceSlug, resolveAssetUrl })`.
- `preparePluginComponent` runs `parseProps`, then `resolveProps`, then serializes the resolved props.
- The Markdown pipeline supplies the source slug and an asset URL resolver.
- Core tests cover source-slug forwarding, asset resolution, and failure propagation.
- Limitation: the pipeline runs `renderPluginComponents` before `remarkRehype`, `rehypeRaw`, sanitization, and manifest asset finalization. `image-compare` therefore still uses its placeholder and `onManifestCreated` hook. Moving that plugin requires a second resolution point after the manifest is final.

## Phase 2

- `packages/core/src/plugin_component_hast.ts` registers `hastComponents` and `defineHastComponent`.
- HAST components run after raw HTML, the sanitizer, and the style/object sanitizers. They receive the matched node, serialized HTML, and serialized children.
- The core test verifies wrapping and confirms that `<script>` and `onclick` are removed before the component sees the node.
- No plugin has been moved to this API. `code-tabs` still emits its accessible tab structure from the Rehype pass, so the migration ledger keeps it at C with the new API noted as available.

## Phase 3

- `packages/ui/src/overlay/index.tsx` provides `OverlayHost` and `findOverlayHost`.
- The website renderer places one `text-fragment` host at body start.
- The text-fragment client uses the app-owned host when present and removes only a host that it created itself.
- UI tests cover the overlay slot and existing drawer/dialog/tabs behavior.
- Missing: `head`, `bodyStart`, `articleAfter`, and `app` slots; a single mount per page; focus restoration and scroll locking across SPA navigation.

## Phase 4

- `packages/diagram/src/client.ts` accepts a selector and centralizes pending-node discovery, lifecycle state, error handling, and fallback opening.
- `graphviz` uses the shared lifecycle and its fallback carries `dataDiagramFallback="true"`.
- The diagram client tests cover selector handling, lifecycle, cleanup, and failure fallback.
- Remaining renderers: `mermaid`, `d2`, `wavedrom`, `vega-lite`, `markmap`, `map`, `chartjs`, and `excalibrain`.
- There is no dedicated browser E2E for the migrated Graphviz path.

## Final re-audit after the main merge

- The repository still contains 85 plugin directories and 32 plugins with `createClientEntry`.
- `pnpm check:client-entries` passes, so every non-global client entry is gated.
- Main added content-mutation and derived-view changes only; no plugin UI changed.
- The migration ledger's A/B/C/D counts remain valid.
- B records that keep imperative work are accurate: the declarative shell is noted separately from browser effects.
- `image-compare` remains `KEEP_IMPERATIVE` because manifest-finalized props are still unsupported, not because its markup is inherently imperative.
- `code-tabs` remains C because the new HAST API has no production consumer yet.
- No assertions were deleted or weakened. The Excalidraw browser test covers the public docs embed instead of the intentionally private `/assets/HW` route; standalone rendering remains covered by the Excalidraw page tests.

## Verification

| Check | Result |
| --- | --- |
| `pnpm test:e2e:external` | PASS; external site built from published artifacts |
| `node --import tsx --test tests/interactive-runtime/official.test.ts` | PASS 8/8 |
| `pnpm --filter @riebeckite/web build` | PASS; 1,042 pages |
| `pnpm typecheck` | PASS; 3 projects |
| `pnpm check` | PASS; 1,818 files |
| `pnpm check:packages` | PASS; 117 packages |
| `pnpm check:docs` | PASS; 1,228 Markdown files, 85 plugins, 28 themes |
| `pnpm check:client-entries` | PASS |
| `pnpm --filter @riebeckite/core test` | PASS 564/564 |
| `pnpm --filter @riebeckite/node test` | PASS 92/92 |
| `pnpm --filter @riebeckite/plugin-search test` | PASS 32/32 |
| `pnpm --filter @riebeckite/plugin-mdx test` | PASS 11/11 |
| UI tests | PASS 12/12 |
| Diagram tests | PASS 8/8 |
| Text-fragment tests | PASS 21/21 |
| Changelog tests | PASS 9/9 |

The Graphviz package has no test files of its own; the shared lifecycle is covered by `packages/diagram/test/client.test.ts`. A workspace-wide `pnpm test` was not run; the packages affected by this branch and the merge were tested individually.

## Remaining work

1. Resolve component props after manifest asset finalization and migrate `image-compare`.
2. Move a real consumer to `hastComponents` and add browser coverage.
3. Add generic app slots and the one-mount/SPA focus and scroll contract.
4. Move the remaining external renderers to the shared lifecycle and add a browser test.
5. Add an implementation ledger or update this report when those phases finish.

## Merge readiness

All verification gates pass on `64603375`, including the external scaffold E2E. The branch is reviewable and safe to integrate from a gate perspective. It is not architecturally complete: Phases 1, 3, and 4 remain partial, and Phase 2 has no production consumer. Do not merge, push, or deploy without accepting that scope.
