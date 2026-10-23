# @riebeckite/plugin-archive

<!-- Generated from docs/docs/plugins/archive.ja.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

[English](./README.md)

Riebeckite の月別アーカイブ一覧ページを生成するプラグインです。一覧は Core の
collection 機構（`buildContentCollections`）で組み立てるため、リンク・順序・
ページネーションはサイト全体と同じクエリパイプラインを再利用します。

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

`archive` という 1 つの PageType を登録し、プラグインを有効にしている間だけ
ルートを生成します。ルートはアプリケーションコードではなくプラグインが生成
し、サイトのキャッチオールのコンテンツルートが配信します。専用のアプリケーション
ルートは不要です。

- `archive`: `<basePath>/<yyyy>/<mm>` に月ごとの一覧ページを、ページネー
  ションがある場合は `<basePath>/<yyyy>/<mm>/page/<n>` に追加ページを生成
  します。

エントリは `published`、`date`、`created` のうち最初に利用できる日付を月単位
でグループ化します。月は新しい順に並び、各リンクにはエントリの解決済みパーマ
リンクを使います。

## 公開範囲と言語

一覧は `manifest.discoverableEntries` から組み立てるため、unlisted・下書き・
スケジュール公開のノートは現れません。期間タイトルと前後ページのラベルは
`site.locale` に従います。プラグインの `locale` で上書きできます。日本語と英語
のラベルを用意し、期間は `Intl.DateTimeFormat` で任意のロケール向けに整形し
ます。`en_US` のようなアンダースコア区切りのロケールは整形前に正規化しま
す。

解決したページは `description` と `language` も設定するため、サイトの
ドキュメントフレームは期間を再計算せずにアーカイブの SEO メタデータと `lang` 属性
を描画できます。

## オプション

| オプション | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `basePath` | `string` | `"/archive"` | 生成ページのパス接頭辞。空文字列で無効化します。 |
| `pageSize` | `number` | `10` | 1 ページあたりのエントリ数。`0` で単一ページにします。 |
| `locale` | `string` | `site.locale` | 期間・ページネーションのラベルに使うロケール。 |
| `className` | `string` | `"rb-archive"` | 描画フラグメントのルート CSS クラス。 |

## エクスポート

- `archive` / `archivePlugin`：プラグインファクトリ。
- `resolveArchiveOptions`：既定値を適用してオプションを解決します。
- `buildArchiveCollections`：エントリから月別 collection を組み立てます。
- `archiveDefinitions`：プラグインが使う Core collection 定義。
- `renderArchivePage`：アーカイブ一覧ページを HTML に描画します。
- `formatArchivePeriod`、`archivePaginationLabels`、
  `buildArchiveDescription`：ロケール補助関数。
- `DEFAULT_ARCHIVE_BASE_PATH`、`DEFAULT_ARCHIVE_PAGE_SIZE`、
  `DEFAULT_ARCHIVE_CLASS_NAME`、`ARCHIVE_COLLECTION_KIND`。

## 補足

スタイルシートは同梱しません。描画フラグメントは `rb-archive` クラスを持つ
ので、サイト側で直接スタイルできます。`/archive` が既存コンテンツと衝突す
る場合は `basePath` を変更し、プラグインを残したまま生成ページを止めたい場合は
`""` を設定します。
