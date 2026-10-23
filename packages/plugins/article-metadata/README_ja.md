# @riebeckite/plugin-article-metadata

<!-- Generated from docs/docs/plugins/article-metadata.ja.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

記事の公開日・更新日・読了時間・タクソノミーのタグを、記事コンテキストから描画するプラグインです。

[English](./README.md)

## できること

`articleMetadataPlugin()` はコンポーネントのスタイルシートを登録します。ルートの追加や Markdown 本文の変更は行いません。

サイトは、メタデータを表示したい位置でコンポーネントを描画します。

```tsx
import ArticleMetadata from "@riebeckite/plugin-article-metadata/components";

<ArticleMetadata locale="ja-JP" />;
```

コンポーネントは記事コンテキストから現在の記事を読み取ります。公開日は `published`、`date`、`created` の順に採用し、`updated`、計算した読了時間、`tags` も描画します。記事コンテキストがない場合は何も描画しません。

タグのリンクはタクソノミープラグインの解決済み設定を使うため、独自の `tagsBasePath` にも追随します。タグページが無効な場合はタグをテキストで表示します。サイトコンテキストがない場合もテキスト表示です。

## オプション

| Prop | 既定値 | 説明 |
| --- | --- | --- |
| `locale` | `"en-US"` | `Intl.DateTimeFormat` に渡すロケール。 |
| `labels.published` | `"PUBLISHED"` | 公開日のラベル。 |
| `labels.updated` | `"UPDATED"` | 更新日のラベル。 |
| `labels.read` | `"READ"` | 読了時間のラベル。 |
| `labels.tags` | `"Tags"` | タグ一覧のアクセシブルなラベル。 |

## スタイル

コンポーネントは `rr-article-metadata` をルートに、`rr-article-metadata__*` を要素に使います。テーマはこれらのフックで見た目を変更できます。
