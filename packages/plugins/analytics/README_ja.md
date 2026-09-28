# @riebeckite/plugin-analytics

サイトに外部プロバイダの解析タグを挿入するプラグインです。静的なブートストラップ用エンドポイントと、それを読み込むクライアントエントリを提供します。

[English](./README_en.md)

## 概要

`analytics()` は次の2つを登録します。

- プロバイダのブートストラップ JavaScript を返す GET エンドポイント（既定は `/_analytics.js`）
- `document.head` に `<script defer src="/_analytics.js">` を一度だけ追加するクライアントエントリ `initAnalytics`

このプラグインはビルド時に完結します。静的ビルド中にプロバイダのコードを実行することはありません。

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { analytics } from "@riebeckite/plugin-analytics";

export default defineConfig({
  // ...
  plugins: [
    analytics({ provider: "plausible", domain: "example.com" }),
  ],
});
```

プロバイダごとの例:

```ts
analytics({ provider: "plausible", domain: "example.com" });
analytics({ provider: "umami", siteId: "xxxxxxxx-xxxx-xxxx" });
analytics({ provider: "umami", siteId: "…", domain: "example.com" });
analytics({ provider: "google-analytics", measurementId: "G-XXXXXXXXXX" });
analytics({ provider: "custom", scriptUrl: "https://cdn.example.com/a.js" });
analytics({ provider: "custom", snippet: "window.__analytics = true;" });
```

## オプション

| 項目 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `provider` | `"plausible" \| "umami" \| "google-analytics" \| "custom"` | はい | 使用するプロバイダ |
| `domain` | `string` | Plausible では必須、Umami では任意 | Plausible の `data-domain`、または Umami の `data-domains` |
| `siteId` | `string` | Umami | Umami の `data-website-id` |
| `measurementId` | `string` | google-analytics | GA の測定 ID（`G-…`） |
| `scriptUrl` | `string` | プロバイダの既定値 | プロバイダのスクリプト URL を上書きします。`snippet` がない custom では読み込む URL |
| `snippet` | `string` | custom（`scriptUrl` がない場合） | そのまま配信される生のブートストラップ JavaScript |
| `scriptPath` | `string` | `/_analytics.js` | エンドポイント兼クライアントスクリプトのパス |

`validateOptions` は不足・型違いのフィールドを標準の設定検証として報告するため、設定ミスは `riebeckite check` で早い段階に失敗します。

プロバイダの既定スクリプト URL:

| プロバイダ | 既定 URL |
| --- | --- |
| `plausible` | `https://plausible.io/js/script.js` |
| `umami` | `https://cloud.umami.is/script.js` |
| `google-analytics` | `https://www.googletagmanager.com/gtag/js` |

## エンドポイントの契約

- `GET /_analytics.js`
- `200 OK`
- `Content-Type: application/javascript; charset=utf-8`
- `Cache-Control: public, max-age=3600`
- 本文: プロバイダの `<script>` タグ（必要に応じて `async` / `defer`）を生成する即時実行スニペット。設定値はすべて JSON エンコードされるため、文字列リテラルを壊すことはできません。

`google-analytics` は測定 ID を設定する前に `window.dataLayer` と `window.gtag` を定義します。`custom` は `snippet` をそのまま返すか、`scriptUrl` 用の汎用ローダーを返します。

## クライアントの挙動（`initAnalytics`）

- `initRiebeckiteClient()` 経由でページ読み込み時に実行されます。コンポーネントやレイアウトの変更は不要です。
- `<script defer src="/_analytics.js" data-riebeckite-analytics>` を `document.head` に1つ追加します。すでに存在する場合は何もしません。

## プライバシーと信頼境界

- ビルド時に解析データを収集することはありません。エンドポイントはコードを返すだけです。
- `custom` の `snippet`（および任意の `scriptUrl`）は訪問者のページにそのまま挿入されます。信頼できる設定として扱い、ユーザー入力から組み立てないでください。
- 内容のサニタイズやプロキシは行いません。設定したプロバイダは、サイト自身のオリジンとプライバシー方針のもとでブラウザから直接リクエストを受け取ります。

## 検証しやすさ

静的ビルドではクライアント JavaScript を実行しません。そのため、`onManifestCreated` が全エントリの HTML に安定したマーカーを付与します。

```html
<!-- RIEBECKITE_EXTERNAL_ANALYTICS_MARKER -->
<link rel="preload" as="script" href="/_analytics.js" />
<script defer src="/_analytics.js"></script>
```

このマーカーは冪等で、周囲の HTML 構造を変えません。

## 制限事項

- **クライアント側のパスは固定です。** クライアントエントリはオプションを受け取らないため、常に `/_analytics.js` を読み込みます。`scriptPath` を変更する場合は、エンドポイントのマウントと読み込みを独自のクライアントエントリで行ってください。
- **SPA のルート遷移には対応しません。** クライアントサイドのルーティングによる画面遷移は自動では計測されません。プロバイダ側で設定するか、手動でイベントを送信してください。
- **ドキュメントのライフサイクルは初回読み込みのみです。** より複雑なライフサイクルが必要な場合は独自の `snippet` を用意してください。
- **同意管理は行いません。** 法令上必要な場合は、クライアントエントリ側で同意を得るまで読み込みを止めてください。

## 主なエクスポート

- `analytics(options)` / `analyticsPlugin(options)`: プラグインを作成する
- `initAnalytics`: クライアント側の初期化（`@riebeckite/plugin-analytics/client` からも利用可）
- `buildAnalyticsScript(options)`: ブートストラップを生成する純粋関数
- `validateAnalyticsOptions(options)`: オプションの検証
- 定数: `ANALYTICS_SCRIPT_PATH`、`ANALYTICS_MARKER`
- 型: `AnalyticsOptions`、`AnalyticsProvider`

## 関連資料

- [プラグインガイド](../../../docs/ja/plugin-system.md)
