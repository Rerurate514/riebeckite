# @riebeckite/plugin-taxonomy

Riebeckite のビルド時タクソノミー（タグ・フォルダ）プラグインです。一覧用データ、
語ごとの RSS / Atom / JSON フィード、関連タグナビゲーション、SEO メタデータを
生成します。クライアント JavaScript は不要です。

[English](./README.md)

## 概要

`taxonomy()` はマニフェストの公開エントリを読み、Core の collection contract
（`buildContentCollections`）で 2 種類の一覧語を生成します。

- **タグ**: `tags` でグルーピングし `/tags/<slug>` に配置します。
- **フォルダ**: フォルダでグルーピングし `/folders/<path>` に配置します。

エントリのリンクには常に解決済みの `permalink` を使い、slug から URL を組み立てる
ことはありません。

このプラグインはデータ・フィード・SEO に加え、`/tags/<tag>` と
`/folders/<path>` の Page Type を提供します。語ごとのフィードは build の
generated-output sink 経由で静的ファイルとして出力します。サイトは共通の
Riebeckite catch-all route で Page Type を描画するため、taxonomy 専用の
アプリケーションルートは不要です。

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
      folderIndexes: true,
    }),
  ],
});
```

## オプション

| オプション | 型 | 既定値 | 説明 |
| ---------- | -- | ------ | ---- |
| `tags` | `boolean` | `true` | タグ語を生成する |
| `folders` | `boolean` | `true` | フォルダ語を生成する |
| `tagsBasePath` | `string` | `"/tags"` | タグ一覧のパス接頭辞 |
| `foldersBasePath` | `string` | `"/folders"` | フォルダ一覧のパス接頭辞 |
| `folderDepth` | `number` | `0` | フォルダのグルーピング深さ。`0` は完全パス |
| `minEntries` | `number` | `1` | これ未満のエントリ数しかない語を除外する |
| `related` | `boolean` | `true` | 関連タグナビゲーションを生成する |
| `relatedLimit` | `number` | `8` | タグごとの関連タグ上限 |
| `folderIndexes` | `boolean` | `false` | `<folder>/index.md` を `/<folder>` に解決する |
| `feeds` | `{ rss?, atom?, json? }` | すべて `true` | 語ごとのフィード形式 |
| `feedLimit` | `number` | `50` | フィードあたりの最大エントリ数 |
| `resolveTitle` | `(context) => string` | `#value` / パス | 語の表示タイトル |
| `className` | `string` | `"rr-taxonomy"` | ページ断片のルート CSS クラス |
| `dataEndpoint` | `string` | `"/taxonomy/index.json"` | JSON データのエンドポイント |

## データエンドポイント

プラグインは JSON エンドポイントを 1 つ登録します（endpoint contract は HonoX
integration が接続するため、プラグイン自身は framework のルーティングを持ちません）。

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

ペイロードは決定的で JSON 安全な射影です。描画済み HTML を含まないため、アプリの
ルートやブラウザへそのまま渡せます。

## 生成されるフィード

ビルド時に、語と形式ごとに 1 つのフィードを `context.output.emit` で出力します。

| 形式 | パス |
| ---- | ---- |
| RSS 2.0 | `/tags/<slug>/feed.xml` |
| Atom | `/tags/<slug>/atom.xml` |
| JSON Feed 1.1 | `/tags/<slug>/feed.json` |

フォルダ語も同じファイルを `/folders/<path>/…` に持ちます。フィードの channel は
語ごとのタイトルと self link を持つため、タグの購読と
`@riebeckite/plugin-seo` が持つサイト全体のフィードを区別できます。公開かつ
`noindex` でないエントリだけがマニフェストの公開ビューに入り、フィードへ届きます。

## 関連タグ

`related` が有効なとき、各タグ語は同じエントリに共起するタグを保持します。共起
エントリ数で降順、同数ならアルファベット順に並べ、`relatedLimit` で打ち切ります。
ナビゲーションは `renderTaxonomyPage` が描画します。

```html
<nav class="rr-taxonomy__related" aria-label="Related tags" data-rr-taxonomy-related>
  <ul>
    <li class="rr-taxonomy__related-item">
      <a class="rr-taxonomy__related-link" href="/tags/featured" data-rr-taxonomy-related-count="2">#featured</a>
    </li>
  </ul>
</nav>
```

## SEO

`buildTaxonomySeo(config, term)` は一覧ページの `SeoMetadata` を返します。設定済みの
Core `seo` 拡張ポイント（たとえば `@riebeckite/plugin-seo`）へ委譲するため、
タイトル・canonical URL・JSON-LD がサイト全体と揃います。SEO プロバイダーが無い
場合は最小限のオブジェクトへフォールバックします。

## フォルダ index note

`folderIndexes: true` のとき、プラグインの `resolveContentLocations` フックが
`<folder>/index.md` のノートを `/<folder>/index` ではなく `/<folder>` に解決します。
選ばれた permalink は `metadata["taxonomy.folder"]` に記録されます。すでに他の
ノートが所有している location は決して奪わず、衝突は診断として報告します。

## Page Type

`taxonomy()` は `taxonomy-term` を登録します。SSG のパスと resolver は公開
マニフェストから作るため、非公開エントリがタグ・フォルダページへ入ることはありません。
返す page body にはフィード検出用の `<link rel="alternate">` メタデータを含め、
共通の document frame が head に描画します。

サイトの共通 catch-all route では、`@riebeckite/honox/server` の
`pluginPageSsgParams(content)` と `resolveRiebeckiteRoute(content, path)` を使います。
これはすべての Plugin Page Type に共通の配線です。

## スタイル

パッケージは安定した `rr-taxonomy` ルートフックと `--rr-taxonomy-*` トークン
（`--rb-*` へフォールバック）を持つ `style.css` を同梱します。他のプラグイン
スタイルシートと同じように登録してください。

```ts
import "@riebeckite/plugin-taxonomy/style.css";
```

## エクスポート

- `taxonomy(options?)` — プラグインファクトリー
- `taxonomyPlugin` — `taxonomy` の別名
- `resolveTaxonomyOptions(options?)` — 既定値を適用する
- `resolveTaxonomyOptionsFromConfig(config)` — config から解決済みオプションを読む
- `buildTaxonomyIndex(entries, options)` — タグ・フォルダ語を構築する
- `serializeTaxonomyIndex(index)` / `serializeTaxonomyTerm(term)` — JSON 安全な射影
- `renderTaxonomyPage(term, options)` / `renderRelatedTerms(term, options)` — ページ断片
- `renderTermFeed(config, term, format, limit?)` / `buildFeedHeadTags(term)` — 語ごとのフィード
- `buildTaxonomySeo(config, term)` — 一覧ページの SEO メタデータ
- `resolveFolderIndexLocations(entries, options, diagnostics)` — フォルダ index の location 戦略
- `slugifyTaxonomyValue(value)` — URL・ファイル用の slug
- `buildTaxonomyAbsoluteUrl(config, pathOrUrl)` — 絶対 URL
- 型: `TaxonomyOptions`, `ResolvedTaxonomyOptions`, `TaxonomyTerm`, `TaxonomyIndex`, `TaxonomyPage`, `TaxonomyTermData`, `TaxonomyIndexData`

## 制約

- タクソノミーはビルド時に固定されます。フルビルドで常に正しく再計算されます。
- 語ごとのフィードは静的なビルド成果物です。実行時のサーフェスは固定の JSON
  データエンドポイントだけです。dev サーバーは語ごとのフィードファイルを列挙
  しません。
- 語はマニフェストの公開ビューのみを反映します。非公開または `noindex` の
  エントリは除外されます。

## 関連

- [プラグインガイド](../../../docs/ja/reference/plugin-api.md)
- [コンテンツシステム](../../../docs/ja/framework/content-system.md)
