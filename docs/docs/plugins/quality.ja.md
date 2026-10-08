<!-- Generated from packages/plugins/quality/README_ja.md. Do not edit this page directly; edit the package README and run `pnpm docs:sync`. -->

# Quality

Riebeckite が生成する HTML を静的に検査し、品質とアクセシビリティの問題を報告するプラグインです。

[English](./quality.md)

## 概要

`qualityPlugin()` は、ビルドで生成された HTML に対して依存パッケージなしの正規表現ベースのルールを実行し、結果を既存の diagnostics に流します。DOM も axe-core もヘッドレスブラウザも使いません。

マニフェスト生成の段階では、公開エントリごとの記事 HTML を検査します。HTML 生成を完了する統合側は、公開ページ向けに公開 API の `inspectGeneratedHtml` を追加で呼び出せます。

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { qualityPlugin } from "@riebeckite/plugin-quality";

export default defineConfig({
  // ...
  plugins: [qualityPlugin({ failOn: "error" })],
});
```

## オプション

| オプション | 型 | 説明 |
| ---------- | -- | ---- |
| `ignoreRules` | `string[]` | 抑制する diagnostic の code（例: `"quality:empty-link-text"`）。 |
| `a11y` | `{ enabled?: boolean }` | アクセシビリティ検査。既定は有効で、`enabled: false` で全ルールを止めます。 |
| `failOn` | `"error" \| "never"` | マニフェスト段階で error の diagnostic があればビルドを失敗させます。既定は `"never"`。 |

## ルール一覧

| Code | 重大度 | 内容 |
| ---- | ------ | ---- |
| `quality:img-alt-missing` | warning | `alt` のない `<img>`。装飾画像の `alt=""` は対象外です。 |
| `quality:duplicate-id` | error | 同じ `id` が同一文書内で複数回使われています。 |
| `quality:broken-internal-anchor` | warning | `href="#foo"` に対応する `id="foo"` が文書内にありません。 |
| `quality:heading-order` | warning | 見出しレベルの飛び（`h1` → `h3` など）、または `h1` が 1 つもない状態。 |
| `quality:empty-link-text` | warning | テキストが空で、`aria-label`・`title`・alt 付き `img` もない `<a href>`。 |
| `quality:html-lang-missing` | warning | 空でない `lang` を持たない `<html>`（完全な文書のみ）。 |
| `quality:table-no-header` | warning | データセルはあるが `<th>`・`scope`・`headers` がない `<table>`。 |

## API

- `qualityPlugin(options?)` — プラグインファクトリ。
- `inspectHtml(html, options?)` — `Diagnostic[]` を返す純粋関数。
- `inspectGeneratedHtml(page, options?)` — 最終ページを検査し、`filePath` に `page.path` を設定する純粋関数。
- `RULE_CODES` — 安定した code の一覧。
- 型: `QualityOptions`、`InspectOptions`。

## 制限事項

スキャナは正規表現ベースであり、実際の DOM ではありません。不正なマークアップの検証やネストの深さの追跡は行わず、開始タグと終了タグの対応付けは整形式でネストのない要素だけを扱います。走査の前にコメントと `<script>`・`<style>` の中身はマスクします。そのため、文書構造に依存するルール（見出し順、テーブルヘッダー）は、特殊なマークアップでは検出漏れや誤検出が起こりえます。

## 関連

- [プラグインガイド](../reference/plugin-api.ja.md)
