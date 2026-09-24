# @riebeckite/plugin-diagnostics

Content diagnostics for Obsidian vaults / Riebeckite content: broken links,
frontmatter issues, orphan notes, unused assets, and more. Usable as a build
plugin, a programmatic API, and a CLI.

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
- `onBuildEnd` — with `failOnError: true`, throws `DiagnosticsFailure` when
  error-level diagnostics exist

## Checks

| Code | Default severity | What it detects |
| ---- | ---------------- | --------------- |
| `broken-wikilink` | `error` | Wikilink target or fragment does not resolve |
| `broken-image` | `error` | Embedded image or image link does not exist |
| `broken-link` | `error` | Markdown link points to a missing or excluded note/file |
| `unused-asset` | `warning` | Image never referenced by any note (`reportUnusedAssets`) |
| `orphan-note` | `info` | Published note has no incoming links (`reportOrphans`) |
| `missing-frontmatter` | `warning` | No frontmatter, or required fields missing |
| `publish-conflict` | `warning` | `publish: true` combined with `draft: true` / `private: true` |
| `duplicate-title` | `warning` | Multiple published notes share a title |
| `slug-collision` | `error` | Slugs collide case-insensitively |
| `excluded-public` | `warning` | Excluded note is marked `publish: true` |
| `internal-error` | `error` | Content analysis failed |

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `failOnError` | `boolean` | `false` | Fail the build on error-level diagnostics |
| `reportUnusedAssets` | `boolean` | `false` | Report unreferenced images |
| `reportOrphans` | `boolean` | `false` | Report published notes without incoming links |
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
- Report helpers: `buildReport`, `formatDiagnostics`, `groupByCode`,
  `summarize`, `assertNoErrors`, `DiagnosticsFailure`
- Types: `DiagnosticsOptions`, `DiagnosticsReport`, `DiagnosticsSummary`,
  `AnalyzerContentConfig`
- CLI: `riebeckite-diagnostics`

## See also

- [Plugin guide](../../docs/plugins_en.md)
