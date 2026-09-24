# @riebeckite/plugin-diagnostics

Obsidian vault / Riebeckite content 向けの content 診断: 壊れた link・
frontmatter 問題・孤児 note・未使用 asset など。build plugin・programmatic
API・CLI の 3 形式で使えます。

[English](./README_en.md)

## 概要

`diagnostics()` は content directory を解析し、build 時に diagnostic として
問題を報告します。同じチェックは `runDiagnostics()` と
`riebeckite-diagnostics` CLI でも実行できます。

## 使い方（plugin）

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

- `addDiagnostics` — build 時に解析を実行し、結果を
  `manifest.diagnostics` に格納
- `onBuildEnd` — `failOnError: true` かつ error 級 diagnostic があれば
  `DiagnosticsFailure` を throw

## チェック

| Code | デフォルト severity | 検出内容 |
| ---- | ------------------- | -------- |
| `broken-wikilink` | `error` | wikilink の対象や fragment が解決しない |
| `broken-image` | `error` | embed した image や image link が存在しない |
| `broken-link` | `error` | markdown link が欠落・除外済みの note / file を指す |
| `unused-asset` | `warning` | どの note からも参照されていない image（`reportUnusedAssets`） |
| `orphan-note` | `info` | 公開済み note への incoming link が無い（`reportOrphans`） |
| `missing-frontmatter` | `warning` | frontmatter が無い、または必須 field が欠落 |
| `publish-conflict` | `warning` | `publish: true` と `draft: true` / `private: true` の併用 |
| `duplicate-title` | `warning` | 公開済み note 同士で title が重複 |
| `slug-collision` | `error` | slug が大文字小文字を無視して衝突 |
| `excluded-public` | `warning` | 除外済み note に `publish: true` |
| `internal-error` | `error` | content 解析の失敗 |

## オプション

| オプション | 型 | デフォルト | 説明 |
| ---------- | -- | ---------- | ---- |
| `failOnError` | `boolean` | `false` | error 級 diagnostic で build を失敗させる |
| `reportUnusedAssets` | `boolean` | `false` | 参照されていない image を報告 |
| `reportOrphans` | `boolean` | `false` | incoming link が無い公開 note を報告 |
| `requiredFrontmatter` | `string[]` | `[]` | 必須の frontmatter field |
| `severity` | `Partial<Record<DiagnosticCode, DiagnosticSeverity>>` | 上表 | code ごとの severity 上書き |
| `exclude` | `string[]` | `[]` | 追加の exclude glob |
| `publishStrategy` | `"explicit" \| "selective"` | config の値 | 公開 filter の方針 |

## CLI

```bash
riebeckite-diagnostics --config riebeckite.config.ts
riebeckite-diagnostics --content ./content --report-orphans
```

| オプション | 説明 |
| ---------- | ---- |
| `--config <path>` | `riebeckite.config.ts` の path（tsx で load） |
| `--content <dir>` | 解析する content directory（デフォルト: `.`） |
| `--exclude <glob>` | 追加の exclude glob（複数指定可） |
| `--publish-strategy <mode>` | `explicit` \| `selective`（デフォルト: `selective`） |
| `--report-unused-assets` | どの note からも参照されていない image を報告 |
| `--report-orphans` | incoming link が無い公開 note を報告 |
| `--required-frontmatter <f>` | 必須 frontmatter field（カンマ区切り） |
| `--fail-on-error` | error があれば exit code 1（デフォルト） |
| `--exit-on <severity>` | 指定 severity 以上で exit code 1（`info` \| `warning` \| `error`） |
| `--format <text\|json>` | 出力形式（デフォルト: `text`） |
| `--no-color` | ANSI color を無効化 |
| `-h`, `--help` | help を表示 |

Exit code: `0` error なし、`1` error を報告（または `--exit-on` の
threshold 到達）、`2` 引数不正。

`--config` 指定時は config 内の `diagnostics` plugin の option を既定値と
し、明示的に指定した CLI flag が優先されます。`exclude` はマージされます。

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

`runDiagnostics(config | path, options?)` は `DiagnosticsReport`
（`diagnostics`・`errors`・`warnings`・`infos`・`hasErrors`・`hasWarnings`・
`summary`・`byCode`）を返します。

## エクスポート

- `diagnostics(options?)` / `diagnosticsPlugin` — plugin factory
- `runDiagnostics(target, options?)` — 解析を直接実行
- `analyzeContent(config, options?)` — `Diagnostic[]` を返す生の解析
- report helper: `buildReport`・`formatDiagnostics`・`groupByCode`・
  `summarize`・`assertNoErrors`・`DiagnosticsFailure`
- 型: `DiagnosticsOptions`・`DiagnosticsReport`・`DiagnosticsSummary`・
  `AnalyzerContentConfig`
- CLI: `riebeckite-diagnostics`

## 関連

- [Plugin ガイド](../../docs/plugins_jp.md)
