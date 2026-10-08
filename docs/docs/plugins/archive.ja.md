# Archive

[English](./archive.md)

Riebeckite の月別アーカイブ一覧ページです。Core の collection 機構
(`buildContentCollections`) で一覧を組み立てるため、リンク・順序・ページ
ネーションはサイト全体と同じ query パイプラインを再利用します。

## インストール

```bash
pnpm add @riebeckite/plugin-archive
```

## 使い方

```ts
import { archive } from "@riebeckite/plugin-archive";

export default {
  plugins: [archive()],
};
```

## ページタイプ

`archive` という 1 つの Page Type を登録し、plugin を有効にしている間だけ
ルートを生成します。ルートはアプリケーションコードではなく plugin が生成
します。

- `archive`: `<basePath>/<yyyy>/<mm>` に月ごとの一覧ページを、ページネー
  ションがある場合は `<basePath>/<yyyy>/<mm>/page/<n>` に追加ページを生成
  します。

エントリは `published`、`date`、`created` のうち最初に利用できる日付を月単
位でグループ化します。月は新しい順に並び、各リンクはエントリの解決済み
パーマリンクを使います。

## publication と l10n

一覧は `manifest.discoverableEntries` から組み立てるため、unlisted・下書き・
スケジュール公開のノートは現れません。期間タイトルと前後ページのラベルは
`site.locale` に従います。plugin の `locale` で上書きできます。日本語と英語
のラベルを用意し、期間は `Intl.DateTimeFormat` で任意のロケール向けに整形し
ます。

## オプション

| オプション | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `basePath` | `string` | `"/archive"` | 生成ページのパス接頭辞。空文字列で無効化します。 |
| `pageSize` | `number` | `10` | 1 ページあたりのエントリ数。`0` で単一ページにします。 |
| `locale` | `string` | `site.locale` | 期間・ページネーションのラベルに使うロケール。 |
| `className` | `string` | `"rb-archive"` | 描画フラグメントのルート CSS クラス。 |

## エクスポート

- `archive` / `archivePlugin` — plugin ファクトリ。
- `resolveArchiveOptions` — 既定値を適用してオプションを解決します。
- `buildArchiveCollections` — エントリから月別 collection を組み立てます。
- `archiveDefinitions` — plugin が使う Core collection 定義。
- `renderArchivePage` — アーカイブ一覧ページを HTML に描画します。
- `formatArchivePeriod`、`archivePaginationLabels` — ロケール補助関数。
- `DEFAULT_ARCHIVE_BASE_PATH`、`DEFAULT_ARCHIVE_PAGE_SIZE`、
  `DEFAULT_ARCHIVE_CLASS_NAME`、`ARCHIVE_COLLECTION_KIND`。

## 補足

スタイルシートは同梱しません。描画フラグメントは `rb-archive` クラスを持つ
ので、サイト側で直接スタイルできます。`/archive` が既存コンテンツと衝突す
る場合は `basePath` を変更し、plugin を残したまま生成ページを止めたい場合は
`""` を設定します。
