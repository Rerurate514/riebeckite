---
date: 2026-11-01
created: 2026-11-01
modified: 2026-11-01
title: Vault Heatmap
---
# Vault Heatmap

frontmatter の日付から Vault のアクティビティをカレンダーヒートマップで表示するプラグインです。任意のノートに `vault-heatmap` フェンスコードブロックを書くと、公開 Vault 全体の集計をビルド時に描画します。

[English](./vault-heatmap.md)

## 概要

````markdown
```vault-heatmap
weeks: 26
title: 執筆アクティビティ
weekStart: monday
end: 2026-10-31
```
````

各エントリの frontmatter から日付プロパティを読みます。既定では `created`（なければ `date`、`published`）を作成日、`modified`（なければ `updated`）を変更日として数えます。`createdFields` と `modifiedFields` でプロパティを変更でき、各リストで最初に見つかった有効な日付を使います。有効な日付がないエントリは集計に含みません。

集計対象は公開一覧に出る public コンテンツだけです。draft、unlisted、公開時刻に達していない scheduled は含まれないため、未公開の活動がヒートマップから分かることはありません。

既定の終了日は壁時計ではなく最新のアクティビティ日です。コンテンツが変わらなければ、同じ HTML が再現されます。

## 設定

```ts
import { defineConfig } from "@riebeckite/core";
import { vaultHeatmap } from "@riebeckite/plugin-vault-heatmap";

export default defineConfig({
  // ...
  plugins: [
    vaultHeatmap({
      createdFields: ["created", "date", "published", "posted"],
      modifiedFields: ["modified", "updated"],
    }),
  ],
});
```

プラグインは `vault-heatmap.activity` という派生ビューを登録し、マニフェスト生成時にブロックを描画します。ヒートマップのデータ用にクライアント JavaScript は読み込みません。

## オプション

| オプション | 型 | 既定値 | 内容 |
| --- | --- | --- | --- |
| `weeks` | `number` | `52` | 週数（1〜104） |
| `title` | `string` | `Vault activity` | グリッド上のキャプション |
| `weekStart` | `"sunday" \| "monday"` | `"sunday"` | 各週の開始曜日 |
| `language` | `string` | `"vault-heatmap"` | フェンスコードブロックの言語 |
| `createdFields` | `string[]` | `["created", "date", "published"]` | 作成日として使うプロパティ（フォールバック順） |
| `modifiedFields` | `string[]` | `["modified", "updated"]` | 変更日として使うプロパティ（フォールバック順） |

## ブロックのフィールド

| フィールド | 型 | 内容 |
| --- | --- | --- |
| `weeks` | `number` | プラグインオプションを上書き（1〜104） |
| `title` | `string` | プラグインオプションを上書き |
| `weekStart` | `"sunday" \| "monday"` | プラグインオプションを上書き |
| `end` | `string` | 範囲の最終日を `YYYY-MM-DD` で指定。既定は最新のアクティビティ日 |

## 使用例

````markdown
```vault-heatmap
---
weeks: 26
title: ドキュメントの更新状況
weekStart: monday
---
```
````

```vault-heatmap
---
weeks: 26
title: ドキュメントの更新状況
weekStart: monday
---
```

## 出力とアクセシビリティ

出力は静的な HTML です。キャプション、1 日 1 セルのグリッド、更新数とアクティブ日数の要約、Less から More への凡例を `<figure>` にまとめます。各セルは title に日付と件数を出し、グリッドには範囲と合計を説明する `role="img"` ラベルを付けます。

色は既存の `--rb-color-success` トークンと `color-mix` で作り、Default、Light、Dark の各テーマに追従します。空の日はページ背景と区別でき、狭い画面ではグリッドを横スクロールできます。

## 診断

| コード | 重大度 | 内容 |
| --- | --- | --- |
| `vault-heatmap-invalid` | `error` | ブロックが不正、日付が無効、または派生ビューの解決に失敗。ブロックはエラーボックスに置き換わります |

## 関連資料

- [プラグインシステム](../reference/plugin-api.ja.md)
- [Core API](../reference/core-api.ja.md)
