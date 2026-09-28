# @riebeckite/plugin-diagnostics

コンテンツのリンク切れ、公開設定の矛盾、frontmatter の不足などを検出するプラグインです。ビルド時の診断だけでなく、CLI とプログラムからの実行にも対応します。

[English](./README.md)

## まずはビルドに診断を加える

通常は `diagnostics()` を設定に登録します。診断結果は manifest に入り、`failOnError` を有効にするとエラーがあったビルドを失敗させられます。

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

## 検出する問題

| コード | 既定の重要度 | 内容 |
| --- | --- | --- |
| `broken-wikilink` | error | Wikiリンクの参照先またはフラグメントを解決できない |
| `broken-image` | error | 埋め込み画像または画像リンクの参照先がない |
| `broken-link` | error | Markdown リンクが存在しない、または除外されたノートを指す |
| `unused-asset` | warning | どのノートからも参照されない画像 |
| `orphan-note` | info | 公開ノートのうち、他のノートからリンクされていないもの |
| `missing-frontmatter` | warning | frontmatter がない、または必須フィールドが欠けている |
| `publish-conflict` | warning | `publish: true` と `draft: true` または `private: true` が同居している |
| `duplicate-title` | warning | 公開ノート同士でタイトルが重複している |
| `slug-collision` | error | 大文字・小文字を区別しない slug が衝突している |
| `excluded-public` | warning | 除外されたノートに `publish: true` が指定されている |
| `publish-boundary` | warning | 公開コンテンツから非公開コンテンツへリンク・埋め込みしている |
| `internal-error` | error | コンテンツ解析中に処理できないエラーが発生した |

未使用アセットと孤立ノートは、明示的に有効化した場合だけ確認します。意図的に孤立させるトップページなどがあるなら、`reportOrphans` の結果を公開方針と照らして判断してください。

## 設定項目

| 項目 | 既定値 | 説明 |
| --- | --- | --- |
| `failOnError` | `false` | error レベルの診断があればビルドを失敗させる |
| `reportUnusedAssets` | `false` | 未参照画像を報告する |
| `reportOrphans` | `false` | 孤立した公開ノートを報告する |
| `requiredFrontmatter` | `[]` | 必須にする frontmatter フィールド |
| `severity` | コードごとの既定値 | 診断コード別の重要度を上書きする |
| `exclude` | `[]` | 解析対象から追加で除外する glob |
| `publishStrategy` | 設定ファイルの値 | 公開ノートの判定方法 |

## CI や編集時には CLI を使う

設定を読み込んで実行する場合は、次のようにします。

```bash
riebeckite-diagnostics --config riebeckite.config.ts
riebeckite-diagnostics --content ./content --report-orphans
```

`--format json` は機械処理用、`--exit-on warning` は警告以上を CI の失敗条件にしたい場合に使います。終了コードは、問題なしが `0`、指定したしきい値以上の診断があれば `1`、引数の誤りは `2` です。`--config` 使用時は設定内のオプションを既定値にし、CLI で明示した値を優先します。

## アプリケーションから実行する

エディタ連携や独自のレポートには `runDiagnostics()` を使えます。

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

`DiagnosticsReport` には診断の一覧に加え、エラー・警告・情報の件数、コード別の集計、`hasErrors` と `hasWarnings` が入ります。

## 主なエクスポート

- `diagnostics(options?)` / `diagnosticsPlugin`: プラグインを作成する
- `runDiagnostics(target, options?)`: 診断と集計を実行する
- `analyzeContent(config, options?)`: 生の `Diagnostic[]` を取得する
- `formatDiagnostics`、`summarize`、`groupByCode`、`assertNoErrors`: レポート処理用の補助関数
- `DiagnosticsFailure`: `failOnError` または `assertNoErrors` が送出するエラー
- `riebeckite-diagnostics`: CLI

## 関連資料

- [プラグインシステム](../../../docs/ja/plugin-system.md)
