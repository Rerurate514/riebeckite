# @riebeckite/plugin-taxonomy

<!-- Generated from docs/docs/plugins/taxonomy.ja.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Riebeckite のビルド時タクソノミー（タグ・フォルダ）プラグインです。一覧用データ、タームごとの RSS / Atom / JSON フィード、関連タグナビゲーション、SEO メタデータを生成します。クライアント JavaScript は不要です。

[English](./README.md)

## 概要

`taxonomy()` はマニフェストの公開エントリを読み、Core のコレクションの取り決め（`buildContentCollections`）でタグとフォルダという 2 種類のタームを生成します。

- **タグターム**: `tags` でグルーピングし `/tags/<slug>` に配置します。
- **フォルダターム**: フォルダでグルーピングし `/folders/<path>` に配置します。

エントリのリンクには常に解決済みの `permalink` を使い、slug から URL を組み立てることはありません。

このプラグインはデータ・フィード・SEO に加え、`/tags/<tag>` と `/folders/<path>` のページ種別を提供します。タームごとのフィードはビルド時に generated-output sink 経由で静的ファイルとして出力します。サイトは共通の Riebeckite catch-all ルートでページ種別を描画するため、タクソノミー専用のアプリケーションルートは不要です。

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { taxonomy } from "@riebeckite/plugin-taxonomy";

export default defineConfig({
  // ...
  plugins: [
    taxonomy({
      tags: true,
      folders: true,
      related: true,
    }),
  ],
});
```

## オプション

| オプション | 型 | 既定値 | 説明 |
| ---------- | -- | ------ | ---- |
| `tags` | `boolean` | `true` | タグタームを生成する |
| `folders` | `boolean` | `true` | フォルダタームを生成する |
| `tagsBasePath` | `string` | `"/tags"` | タグ一覧のパス接頭辞 |
| `foldersBasePath` | `string` | `"/folders"` | フォルダ一覧のパス接頭辞 |
| `folderDepth` | `number` | `0` | フォルダのグルーピング深さ。`0` は完全パス |
| `minEntries` | `number` | `1` | エントリ数がこれ未満のタームを除外する |
| `related` | `boolean` | `true` | 関連タグナビゲーションを生成する |
| `relatedLimit` | `number` | `8` | タグごとの関連タグ上限 |
| `feeds` | `{ rss?, atom?, json? }` | すべて `true` | タームごとのフィード形式 |
| `feedLimit` | `number` | `50` | フィードあたりの最大エントリ数 |
| `resolveTitle` | `(context) => string` | `#value` / パス | タームの表示タイトル |
| `className` | `string` | `"rr-taxonomy"` | ページ断片のルート CSS クラス |
| `dataEndpoint` | `string` | `"/taxonomy/index.json"` | JSON データのエンドポイント |

## データエンドポイント

プラグインは JSON エンドポイントを 1 つ登録します（エンドポイントの取り決めは HonoX 連携が接続するため、プラグイン自身はフレームワークのルーティングを持ちません）。

```
GET /taxonomy/index.json
```

```json
{
  "tags": [
    {
      "kind": "tag",
      "value": "featured",
      "title": "#featured",
      "path": "/tags/featured",
      "permalink": "/tags/featured",
      "count": 1,
      "entries": [{ "slug": "example", "permalink": "/notes/example", "title": "Example Note", "updated": null, "summary": "..." }],
      "related": [],
      "feeds": { "rss": "/tags/featured/feed.xml", "atom": "/tags/featured/atom.xml", "json": "/tags/featured/feed.json" }
    }
  ],
  "folders": []
}
```

ペイロードは決定的で JSON 安全な射影です。描画済み HTML を含まないため、アプリのルートやブラウザへそのまま渡せます。

## 生成されるフィード

ビルド時に、タームと形式ごとに 1 つのフィードを `context.output.emit` で出力します。

| 形式 | パス |
| ---- | ---- |
| RSS 2.0 | `/tags/<slug>/feed.xml` |
| Atom | `/tags/<slug>/atom.xml` |
| JSON Feed 1.1 | `/tags/<slug>/feed.json` |

フォルダタームも同じファイルを `/folders/<path>/…` に持ちます。フィードのチャネルはタームごとのタイトルと自己リンクを持つため、タグの購読と `@riebeckite/plugin-seo` が持つサイト全体のフィードを区別できます。公開かつ `noindex` でないエントリだけがマニフェストの公開ビューに入り、フィードへ届きます。タームごとの RSS と Atom はエントリの要約を出します。タームごとの JSON Feed は同じ要約を `content_text` として出し、描画済みの記事 HTML は複製しません。

## 関連タグ

`related` が有効なとき、各タグタームは同じエントリに共起するタグを保持します。共起エントリ数で降順、同数ならアルファベット順に並べ、`relatedLimit` で打ち切ります。ナビゲーションは `renderTaxonomyPage` が各タームページで実際に描画します。共起するタグがあるタグページで確認できます。

## SEO

`buildTaxonomySeo(config, term)` は一覧ページの `SeoMetadata` を返します。設定済みの Core `seo` 拡張ポイント（たとえば `@riebeckite/plugin-seo`）へ委譲するため、タイトル・canonical URL・JSON-LD がサイト全体と揃います。SEO プロバイダーが無い場合は最小限のオブジェクトへフォールバックします。

## フォルダの index ノート

フォルダ入口の解決は
[`@riebeckite/plugin-folder-pages`](../folder-pages/README_ja.md) が所有します。
タクソノミーはマニフェストの公開ビューからタグタームとフォルダタームだけを生成します。`<folder>/README.md` や `<folder>/index.md` をフォルダのランディングページにする場合は、そのプラグインを有効にしてください。

## ページ種別

`taxonomy()` は 2 つのページ種別を登録します。`taxonomy-term` は 1 つのタグ・フォルダページを描画し、フィード検出用の `<link rel="alternate">` メタデータを含みます。`taxonomy-index` は `tagsBasePath` に全タグ一覧、`foldersBasePath` に全フォルダ一覧を描画し、各タームへリンクします。どちらも SSG のパスとリゾルバーを公開マニフェストから作るため、非公開エントリがタグ・フォルダ・一覧ページへ入ることはありません。

サイトの共通 catch-all ルートでは、`@riebeckite/honox/server` の `pluginPageSsgParams(content)` と `resolveRiebeckiteRoute(content, path)` を使います。これはすべてのプラグインのページ種別に共通の配線です。

## スタイル

パッケージは安定した `rr-taxonomy` ルートフックと `--rr-taxonomy-*` トークン（`--rb-*` へフォールバック）を持つ `style.css` を同梱します。他のプラグインのスタイルシートと同じように登録してください。

```ts
import "@riebeckite/plugin-taxonomy/style.css";
```

## エクスポート

- `taxonomy(options?)`：プラグインファクトリ
- `taxonomyPlugin`：`taxonomy` の別名
- `resolveTaxonomyOptions(options?)`：既定値を適用する
- `resolveTaxonomyOptionsFromConfig(config)`：config から解決済みオプションを読む
- `buildTaxonomyIndex(entries, options)`：タグ・フォルダタームを構築する
- `serializeTaxonomyIndex(index)` / `serializeTaxonomyTerm(term)`：JSON 安全な射影
- `renderTaxonomyPage(term, options)` / `renderRelatedTerms(term, options)`：ページ断片
- `renderTaxonomyIndexPage(kind, terms, options)`：全タグ・全フォルダ一覧のページ断片
- `renderTermFeed(config, term, format, limit?)` / `buildFeedHeadTags(term)`：タームごとのフィード
- `buildTaxonomySeo(config, term)`：一覧ページの SEO メタデータ
- `slugifyTaxonomyValue(value)`：URL・ファイル用の slug
- `buildTaxonomyAbsoluteUrl(config, pathOrUrl)`：絶対 URL
- 型: `TaxonomyOptions`, `ResolvedTaxonomyOptions`, `TaxonomyTerm`, `TaxonomyIndex`, `TaxonomyPage`, `TaxonomyTermData`, `TaxonomyIndexData`

## 制約

- タクソノミーはビルド時に固定されます。フルビルドで常に正しく再計算されます。
- タームごとのフィードは静的なビルド成果物です。実行時のサーフェスは固定の JSON
  データエンドポイントだけです。開発サーバーはタームごとのフィードファイルを
  列挙しません。
- タームはマニフェストの公開ビューのみを反映します。非公開または `noindex` の
  エントリは除外されます。

## 関連

- [プラグインガイド](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.ja.md)
- [コンテンツシステム](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/framework/content-system.ja.md)
