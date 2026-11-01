---
title: Documentation UX Audit (2026-11-01)
---

# Documentation UX Audit (2026-11-01)

Internal report. Not published to the documentation site (`agents/**` is excluded
from the content root).

## Scope and method

- Repository: `C:\Users\rerur\.wk\others\riebeckite`, branch `main`.
- English canonical pages: 393 files (378 published, 15 `private: true`).
- Japanese counterparts: 393 files. Pairing is enforced by
  `scripts/check_docs.mjs`.
- Published English pages by category:
  - Framework: 58
  - Getting Started: 9
  - Glossary: 115
  - Guides: 45
  - Plugins: 105
  - Reference: 29
  - Themes: 17
- Method:
  - Structural scan of all 378 published English pages: frontmatter, first
    paragraph, first H2, heading list, code-fence count, link count.
  - Close reading of about 40 pages, including every page named in this report.
  - Source verification against `packages/core`, `packages/node`,
    `packages/cli`, `packages/runtime`, and `packages/plugins/*` for the three
    priority pages and for the claims called out below.
- Limitation: the remaining ~338 published pages were scanned structurally but
  not read in full. They are **UNVERIFIED** for semantic accuracy and are not
  counted as problem-free.

## Counts

Initial audit findings. All 13 were resolved on 2026-11-02; see
[Resolution status](#resolution-status-2026-11-02).

| Priority | Pages | Meaning |
| --- | ---: | --- |
| P0 | 0 | No verified contradiction with the implementation and no dangerous instruction was found. |
| P1 | 2 | The purpose or the main setup path cannot be understood from the page. |
| P2 | 8 | Concrete examples, ordering, terminology, or navigation make the task hard to complete. |
| P3 | 3 | Minor structure, density, or example improvements. |
| **Total pages with findings** | **13** | Some pages have more than one finding; the table lists one row per page. |

P0 was not assigned because no verified case was found. This is not a claim that
no P0 exists; it means none was confirmed within the pages read closely.

## Findings

URLs use the English canonical path. The Japanese counterpart has the same issue
unless noted.

| Page | Priority | Problem | Evidence | Proposal |
| --- | --- | --- | --- | --- |
| https://riebeckite.dev/docs/plugins/analytics | P1 | The page opens with storage-independent primitives and a "Design" section. It never explains what a site author must build (a collector endpoint) or how to verify that page views arrive. | Intro: "Storage-independent analytics primitives… contains no Cloudflare, Worker, database, or vendor code" (lines 7-8). First H2: `## Design` (line 12). `collectorUrl` is mentioned but no collector implementation or end-to-end check. | Start with "Track page views on a static site", a 3-step setup, a minimal collector contract, and a verification step (`POST` payload and expected response). Move the provider contract after usage. |
| https://riebeckite.dev/docs/plugins/webmention | P1 | The page leads with verification/storage internals. Usage requires an external provider and endpoint mounting, but neither is shown as a complete setup. | Intro: "Receive Webmentions, verify… store them through a pluggable provider… contains no Cloudflare, Worker, database, or vendor code" (lines 7-10). First H2: `## Design` (line 14). Usage jumps to `d1Storage(env.WEBMENTION_DB)` with no install or `mountRiebeckiteEndpoints` step (lines 34-48). | Add "What you need" (provider package, database binding, route mounting), a minimal local `MemoryWebmentionProvider` demo, and the production checklist. Keep the provider contract as reference. |
| https://riebeckite.dev/docs/plugins/calculator | P2 | The page calls the plugin a "small interactive arithmetic example", but the expression is fixed at build time and there is no input handling. A reader expecting an input-driven calculator is misled. The Japanese page repeats "対話的な計算例". | `calculator.md` lines 7-9; `calculator.ja.md` line 7. The source evaluates `data-calculator-expression` once in `packages/plugins/calculator/src/client.ts`; there is no input element or re-evaluation. | Say "a live evaluation demo with a fixed expression". State explicitly that it is not input-driven and that an input widget needs plugin code. Link to the runtime page's demo section. |
| https://riebeckite.dev/docs/plugins/frontmatter-transformer | P2 | The page lists presets and commands but never shows what a preset changes in a file. A user cannot predict the diff or decide which preset to run. | Lines 40-46 define presets only as one-line descriptions. No before/after Markdown, no sample plan output. | Add a before/after Frontmatter block for `normalize-tags`, a sample `frontmatter plan` summary, and a note that `plan` is a dry run. |
| https://riebeckite.dev/docs/plugins/deploy | P2 | The title and package name say "Deploy", but the plugin only generates provider files; it does not upload. This conflicts with the Getting Started use of `deploy` and invites the wrong mental model. | Lines 7-9: "It does not upload anything and never writes to the filesystem." `reference/cli/publish.md` line 26: "`riebeckite deploy` no longer deploys." | Add a first-line distinction: "This plugin generates files; it does not deploy. Use `publish run --execute` to deploy." Link to the deployment guide. |
| https://riebeckite.dev/docs/framework/README | P2 | The Framework index tells normal site builders not to read Framework, yet the only detailed pages for `content` and `migrate` live there. The table describes them as internals ("planned, journaled", "versioned changes"), so authors never discover them. | Lines 11-19: "If you only want to build a site… you do not need to read this chapter." Lines 41-42 describe Mutation/Migration as internal mechanics. No link from Guides or the CLI index. | Reword the table entries as user capabilities and add a "Site authors: see the content operations guides" callout. Keep the internal detail in Framework. |
| https://riebeckite.dev/docs/reference/cli | P2 | `content` and `migrate` appear in the command list and contract table, but the "Which command should I use?" flow omits them and there is no link to their detailed pages. | Lines 36-40 list the forms; lines 77-90 show a decision flow without `content` or `migrate`; line 163 links to Diagnostics, Upgrading, and Build system only. | Add both commands to the decision flow and link each contract row to the relevant guide. |
| https://riebeckite.dev/docs/reference/README | P2 | The CLI row enumerates many commands but omits `content` and `migrate`, so the Reference index does not advertise the only bulk content-write features. | Line 35 lists `init`, `create`, `dev`, `check`, `doctor`, `build`, `clean`, `deploy`, `publish`, `upgrade`, `profile`, `inspect`, `help`, `completion`, `theme preview`, `plugin dev`, `plugin verify`; no `content` or `migrate`. | Add both commands and link to the guides. |
| https://riebeckite.dev/docs/guides/README | P2 | The task table has no entry for "change many notes at once", "rename a note and fix links", or "migrate Frontmatter", so the new user-facing procedures are invisible from the Guides index. | Lines 25-38 list writing, customization, SPA, Obsidian, repositories, localization, plugins, analytics, branding, deployment, upgrading. No content operations. | Add a "Content operations" group with Mutation, Migration, and presets. |
| https://riebeckite.dev/docs/guides/upgrading | P2 | The page tells readers to "review the release notes and migration guide for the target version" but does not link to either, and the repository has no changelog page. The main upgrade procedure is therefore not reproducible. | Lines 12 and 33 reference release notes/migration guide with no link. `**/CHANGELOG*` does not exist in the repository. | Link to GitHub Releases or add a versioned upgrade/changelog page. State where breaking changes are published. |
| https://riebeckite.dev/docs/plugins/showcase | P3 | A single catalog page contains 196 code fences and no table of contents. It is useful as a reference but hard to scan. | `showcase.md` frontmatter and 196 fences; no TOC before the first section. | Add a TOC grouped by plugin family, or split the page by category while keeping the catalog index. |
| https://riebeckite.dev/docs/plugins/permalink | P3 | The page is very dense (110 code fences) and mixes basic usage, strategies, redirects, and edge cases without a short "start here" path. | `permalink.md` lines 13-39 show a large configuration before the first minimal example. | Add a 5-line minimal example and a TOC; move strategy details under subheadings. |
| https://riebeckite.dev/docs/plugins/quality | P3 | The rules table lists codes and severities, but there is no example of a diagnostic or of the `doctor` output a user will see. | Lines 41-51 list rules; no sample diagnostic object or terminal output. | Add one failing HTML snippet and the resulting diagnostic. |

## Resolution status (2026-11-02)

All 13 findings were fixed in both English and Japanese. No implementation code
was changed.

| Page | Priority | Resolution |
| --- | --- | --- |
| `plugins/analytics` | P1 | Added a task-first intro, `What it does`, and `Quick start` covering install, a stable content `id`, a `MemoryAnalyticsProvider` collector URL, and a Network-panel check. Renamed `Design` to `How it works` and `Usage` to `Configuration`. |
| `plugins/webmention` | P1 | Added `What it does` and `Quick start` covering install, the in-memory provider, endpoint mounting, `riebeckite dev`, a `GET /webmentions` check, and a `POST` example. Renamed `Design` to `How it works`; production D1 setup is now a separate section. |
| `plugins/calculator` | P2 | The page now says the expression is fixed at build time. Added `What it does` and `What it is not`, stating that input handling does not exist and needs plugin code. |
| `plugins/frontmatter-transformer` | P2 | Added a Frontmatter before/after for `normalize-tags` and `trim-text`, the dry-run and `--apply` commands, and sample plan and apply output. |
| `plugins/deploy` | P2 | Added `What it does` and `What it does not do`: the plugin generates files and never uploads; `publish run --execute` deploys. Added the upload step for generated files. |
| `framework/README` | P2 | Added a note that the three content/runtime pages start with user-facing overviews. Reworded their table entries as capabilities rather than internals. |
| `reference/cli` | P2 | Added `content` and `migrate` to the decision flow, corrected the `Publish` branch from `deploy` to `publish`, and linked both detail pages. |
| `reference/README` | P2 | Added `publish`, `content`, and `migrate` to the CLI list and linked the two content pages. |
| `guides/README` | P2 | Added a task-table entry for bulk content changes and a paragraph distinguishing Mutation from Migration, including presets. |
| `guides/upgrading` | P2 | Linked GitHub Releases in both places where release notes are referenced and removed the unsupported claim of a version migration guide. |
| `plugins/showcase` | P3 | Added an 11-entry contents list grouped by plugin family. |
| `plugins/permalink` | P3 | Added a contents list and a minimal `Start here` example before the full configuration. |
| `plugins/quality` | P3 | Added an `Example output` section with the exact diagnostic for a missing `alt` attribute and the build behavior. |

## Top 10 by priority

1. `plugins/analytics` (P1)
2. `plugins/webmention` (P1)
3. `plugins/calculator` (P2)
4. `plugins/frontmatter-transformer` (P2)
5. `plugins/deploy` (P2)
6. `framework/README` (P2)
7. `reference/cli` (P2)
8. `reference/README` (P2)
9. `guides/README` (P2)
10. `guides/upgrading` (P2)

P3 follow-ups: `plugins/showcase`, `plugins/permalink`, `plugins/quality`.

## Categories with the most issues

- Plugins: 8 of 13 pages. Most plugin pages are accurate and example-driven; the
  problems cluster in pages for services that need external setup (analytics,
  webmention) and in pages whose name or promise overstates what the plugin does
  (calculator, deploy).
- Navigation/index pages: 4 pages (`framework/README`, `reference/cli`,
  `reference/README`, `guides/README`). This is the most consequential cluster
  because it hides the otherwise improved content-operation pages.
- Guides: 1 page (`guides/upgrading`) with a broken external dependency
  (release notes are referenced but not linked).
- Getting Started, Glossary, Themes, and most Reference pages: no verified
  problem in the pages read.

## Cross-cutting root causes

1. **Indexes classify by internal responsibility, not user task.** Framework is
   explicitly "for people who develop Riebeckite", yet it owns the only detailed
   pages for CLI features site authors use. The result is a discoverability gap,
   not a content gap.
2. **Implementation nouns arrive before user vocabulary.** Analytics starts with
   "primitives", Webmention with "provider seam", and the old Mutation/Migration
   pages started with layers and journals. Readers cannot attach the terms to a
   task.
3. **Plugin pages assume a global install instruction.** The Plugins index says
   "install any plugin with `npm install @riebeckite/plugin-<slug>`", so
   individual pages omit install. That is acceptable for self-contained plugins,
   but not for plugins that also need a collector, database, route, or binding.
4. **Examples show configuration, not results.** Many pages show a
   `riebeckite.config.ts` block and an options table. Few show the rendered
   output, the CLI diff, or the failure message.
5. **English and Japanese drift together.** The calculator page says
   "interactive" in English and "対話的" in Japanese; both are wrong in the same
   way. Parity checks cannot catch semantic errors.
6. **Large pages have no entry ramp.** Showcase and Permalink are valuable
   references but lack a TOC or a five-line start.

## Missing guides and tutorials

- **Bulk content operations** (task-oriented): create/edit/move/delete with
  Content Mutation, then rule-based Frontmatter/path changes with Content
  Migration and the Frontmatter Transformer presets. This is the largest gap.
- **Recovery and rollback**: what to do after a failed apply, how to find the
  journal, when rollback is allowed, and what is not recoverable.
- **Interactive widget authoring**: a full plugin tutorial that goes from a
  marker to a client entry, runtime definition, fallback markup, and SPA cleanup.
- **Frontmatter migration from Obsidian/Quartz**: what can be expressed as
  rules, what cannot, and why there is no automatic site importer.
- **Analytics end-to-end**: collector endpoint, provider, verification.
- **Webmention end-to-end**: provider, database binding, endpoint mounting, and
  rendering.

## Reorganization proposal

1. Add a **Content operations** group under Guides:
   - "Edit, move, and delete notes safely" (Mutation)
   - "Change Frontmatter across the site" (Migration + presets)
   - "Recover a failed content change"
2. Link that group from `guides/README`, `reference/cli`, `reference/README`, and
   the `framework/README` table.
3. Keep the Framework pages as the detailed contract, but change their index
   descriptions from "how writes are planned" to "how to change content safely".
4. Add a **Before you start** block to plugin pages that need external services,
   listing the package, binding, endpoint, and verification step.
5. Add a TOC to pages above ~80 code fences; split only when the page has
   clearly separate tasks.
6. Keep English canonical and mirror Japanese. Add a semantic review step for
   claims such as "interactive", "deploy", and "automatic", because parity checks
   only compare structure.

## Priority pages improved in this change

The three requested pages were rewritten before this audit was written, and the
13 findings above were fixed afterwards:

- `docs/docs/framework/content-mutation.md` / `.ja.md`
- `docs/docs/framework/content-migration.md` / `.ja.md`
- `docs/docs/framework/interactive-runtime.md` / `.ja.md`
- The 13 pages listed under [Resolution status](#resolution-status-2026-11-02)

The three priority pages now start with what the feature is for, who uses it,
what can be done, a Before/After example, and a quick start. Internal
architecture, API reference, security, and troubleshooting remain, moved later.
The Interactive Runtime page contains a live Calculator demo using the existing
plugin and runtime; it states that the demo is not input-driven and that an
input widget would require new plugin code.

## Verification notes

- `node scripts/check_docs.mjs`: PASS (1182 markdown files).
- `pnpm check:docs`: PASS (1182 markdown files, Plugin 83, Theme 28).
- `pnpm test:docs`: PASS (19/19). The expected plugin README count was updated
  from 158 to 166 (83 plugin pairs), and six stale generated READMEs for
  `garden-explorer`, `local-graph`, and `vault-heatmap` were regenerated with
  `pnpm docs:sync`.
- `pnpm --filter @riebeckite/web build`: PASS.
- Built HTML for the three priority pages contains the new sections. The
  Interactive Runtime page contains `data-calculator`, the static `Result: 14`,
  and the live output element. The new Showcase, Permalink, and Quality anchors
  resolve in both locales.
- Real-browser check: PASS with headless Edge against `apps/web/dist`. The
  runtime demo showed the live output `14`, hid the loading and fallback
  elements, reported no page errors, and had no broken in-page anchors. With
  JavaScript disabled, the static `Result: 14` remained and the live output
  stayed hidden.
- `pnpm test:runtime:site`: FAIL because the bundled Puppeteer Chrome failed to
  launch (`Code: 3221225595`). This is an environment failure, not a
  documentation failure; the Edge check above covers the same page behavior.
  The official browser test remains UNVERIFIED in this environment.
- CLI end-to-end: PASS in a temporary project, which was removed afterwards.
  `content create`, `content create` with a wikilink, and `content move`
  succeeded; the move rewrote `[[hello]]` to `[[notes/welcome]]`. A command
  without `--apply` wrote nothing. `content delete` left the inbound link in
  place and reported `broken-link` in the dry run and the saved plan.
  State is stored under `<content>/.riebeckite/mutations`, not at the project
  root; the Content Mutation page was corrected to say so.
- `pnpm --filter @riebeckite/core test`: PASS (474).
- `pnpm --filter @riebeckite/node test`: PASS (72).
- `pnpm --filter @riebeckite/runtime test`: PASS (27).
- `git diff --check`: PASS.
- Remaining limitation: about 338 published pages were scanned structurally but
  not read in full. They remain UNVERIFIED for semantic accuracy. No P0 finding
  was confirmed. No push or deploy was performed.
