# @riebeckite/plugin-diagnostics

Content diagnostics for Obsidian vaults / Riebeckite content: site-wide
reference integrity, frontmatter issues, orphan notes, unused assets, and more.
Usable as a build plugin, a programmatic API, and a CLI.

[日本語](./README_ja.md)

## Overview

`diagnostics()` analyzes the content directory and reports problems as
diagnostics during the build. The same checks are available through
`runDiagnostics()` and the `riebeckite-diagnostics` CLI.

## Usage (plugin)

```ts
import { defineConfig } from "@riebeckite/core";
import { diagnostics } from "@riebeckite/plugin-diagnostics";

export default defineConfig({
  // ...
  plugins: [
    diagnostics({
      reportUnusedAssets: true,
      reportOrphans: true,
      requiredFrontmatter: ["title"],
    }),
  ],
});
```

- `addDiagnostics` — runs the analysis at build time; results go to
  `manifest.diagnostics`
- `buildEnd` — with `failOnError: true`, throws `DiagnosticsFailure` when
  error-level diagnostics exist

## Checks

| Code | Default severity | What it detects |
| ---- | ---------------- | --------------- |
| `broken-wikilink` | `error` | Wikilink target or fragment does not resolve |
| `broken-image` | `error` | Embedded image or image link does not exist |
| `broken-link` | `error` | Markdown link points to a missing or excluded note/file |
| `unused-asset` | `warning` | Image never referenced by any note (`reportUnusedAssets`) |
| `orphan-note` | `info` | Published note has no incoming links (`reportOrphans`) |
| `missing-frontmatter` | `warning` | A required frontmatter field is missing |
| `publish-conflict` | `warning` | `publish: true` combined with `draft: true` / `private: true` |
| `duplicate-title` | `warning` | Multiple published notes share a title within the same language |
| `slug-collision` | `error` | Slugs collide case-insensitively |
| `duplicate-content-id` | `error` | Published notes share a stable content ID (`id`) |
| `invalid-content-id` | `error` | `id` frontmatter violates the stable content ID contract |
| `excluded-public` | `warning` | Excluded note is marked `publish: true` |
| `publish-boundary` | `warning` | Published content links to or embeds non-published content |
| `analytics-untracked` | `info` | Published note has no stable `id` and the analytics plugin will not track it (enabled with `reportAnalyticsCoverage`, or automatically when the config enables the analytics plugin) |
| `content-integrity:broken-link` | `warning` | A published page links to a site-local route that is not published or registered |
| `content-integrity:unresolved-wikilink` | `warning` | A published entry contains a WikiLink that the configured WikiLink/content index resolution did not resolve |
| `content-integrity:broken-asset` | `warning` | A published page references a local asset that is not in resolved content assets, plugin assets, generated outputs, or public routes |
| `content-integrity:duplicate-public-location` | `error` | Two published entries or generated routes claim the same final public path |
| `content-integrity:redirect-target-missing` | `warning` | A public redirect points at content whose public target is unavailable |
| `content-integrity:redirect-cycle` | `error` | Public redirects form a cycle |
| `content-integrity:redirect-public-location-conflict` | `error` | A redirect path conflicts with another public route |
| `internal-error` | `error` | Content analysis failed |

## Site-wide content integrity

When used as a Riebeckite plugin, diagnostics runs site-wide integrity checks
from the resolved manifest instead of rescanning content for link rules. It uses
`publicEntries`, resolved `ContentLink` metadata, `ContentPublicLocation`,
`publicRedirects`, plugin page paths, plugin assets, and generated outputs.
This keeps permalink, alias, rename redirect, l10n, publish/exclude, and Page
System behavior aligned with the build pipeline.

It does not check external HTTP reachability, SEO, spelling, Lighthouse, or
automatic repairs. External URLs (`http:`, `https:`, `mailto:`, `tel:`, `data:`),
protocol-relative URLs, and fragment-only links are ignored. Query strings and
fragments are stripped before route existence checks. Plugin authors should
register generated routes through Page Types and generated files/assets through
the existing plugin output/asset contracts so integrity checks can treat them as
valid public targets.

`runDiagnostics()` and the standalone CLI still use the filesystem/content-source
analyzer because no full manifest is available in that mode. As a result,
`orphan-note` and `unused-asset` are reported only by `runDiagnostics()` and the
standalone CLI; during a build they are omitted because link relationships come
from the manifest.

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `failOnError` | `boolean` | `false` | Fail the build on error-level diagnostics |
| `reportUnusedAssets` | `boolean` | `false` | Report unreferenced images |
| `reportOrphans` | `boolean` | `false` | Report published notes without incoming links |
| `reportAnalyticsCoverage` | `boolean` | `false` | Report published notes the analytics plugin will not track (auto-enabled when the resolved config enables the analytics plugin) |
| `requiredFrontmatter` | `string[]` | `[]` | Required frontmatter fields |
| `severity` | `Partial<Record<DiagnosticCode, DiagnosticSeverity>>` | table above | Override severity per code |
| `exclude` | `string[]` | `[]` | Extra exclude globs |
| `publishStrategy` | `"explicit" \| "selective"` | from config | Publication filter strategy |

## CLI

```bash
riebeckite-diagnostics --config riebeckite.config.ts
riebeckite-diagnostics --content ./content --report-orphans
```

| Option | Description |
| ------ | ----------- |
| `--config <path>` | Path to `riebeckite.config.ts` (loaded under tsx) |
| `--content <dir>` | Content directory to analyze (default: `.`) |
| `--exclude <glob>` | Extra exclude glob (repeatable) |
| `--publish-strategy <mode>` | `explicit` \| `selective` (default: `selective`) |
| `--report-unused-assets` | Report images never referenced by any note |
| `--report-orphans` | Report published notes with no incoming links |
| `--report-analytics-coverage` | Report published notes without a stable content ID (auto-enabled for `--config` when the config enables the analytics plugin) |
| `--required-frontmatter <f>` | Comma-separated required frontmatter fields |
| `--fail-on-error` | Exit with code 1 when errors are found (default) |
| `--exit-on <severity>` | Exit with code 1 at/above severity (`info` \| `warning` \| `error`) |
| `--format <text\|json>` | Output format (default: `text`) |
| `--no-color` | Disable ANSI colors |
| `-h`, `--help` | Show help |

Exit codes: `0` no errors, `1` errors reported (or `--exit-on` threshold met),
`2` invalid arguments.

With `--config`, options from the config's `diagnostics` plugin are used as
defaults; explicit CLI flags override them, and `exclude` lists are merged.

## Programmatic API

```ts
import {
  assertNoErrors,
  formatDiagnostics,
  runDiagnostics,
} from "@riebeckite/plugin-diagnostics";

const report = await runDiagnostics("./content", { reportOrphans: true });
console.log(formatDiagnostics(report));
assertNoErrors(report);
```

`runDiagnostics(config | path, options?)` returns a `DiagnosticsReport` with
`diagnostics`, `errors`, `warnings`, `infos`, `hasErrors`, `hasWarnings`,
`summary`, and `byCode`.

## Exports

- `diagnostics(options?)` / `diagnosticsPlugin` — plugin factory
- `runDiagnostics(target, options?)` — run the analysis directly
- `analyzeContent(config, options?)` — raw analysis returning `Diagnostic[]`
- `hasEnabledAnalyticsPlugin(config?)` — whether the resolved config enables the analytics plugin
- Report helpers: `buildReport`, `formatDiagnostics`, `groupByCode`,
  `summarize`, `assertNoErrors`, `DiagnosticsFailure`
- Types: `DiagnosticsOptions`, `DiagnosticsReport`, `DiagnosticsSummary`,
  `AnalyzerContentConfig`
- CLI: `riebeckite-diagnostics`

## See also

- [Plugin guide](../../../docs/en/docs/reference/plugin-api.md)
