# @riebeckite/plugin-analytics

Riebeckite 向けの、ストレージや実行環境に依存しないアクセス解析の基盤です。Cloudflare、Worker、データベース、特定ベンダーの実装は含みません。

[English](./README.md)

## 設計

- `AnalyticsEvent` は型付きの `page_view` を持ち、プロバイダ固有イベントの union に拡張できます。
- `AnalyticsProvider` は対応機能を明示し、`capture` と `query` を提供します。コンテンツ別 PV、人気コンテンツ、任意の ISO 8601 期間を扱えます。
- 未対応クエリは `UnsupportedAnalyticsQueryError` で明示されます。テスト・ローカル用途には `MemoryAnalyticsProvider` を用意しています。
- 認証情報・ストレージ・ランタイムバインディングはプロバイダ内部の非公開設定です。ブラウザへ渡すのは `AnalyticsPublicConfig` だけです。

## 使い方

```ts
import { analytics, MemoryAnalyticsProvider } from "@riebeckite/plugin-analytics";

export default {
  plugins: [
    analytics({
      provider: new MemoryAnalyticsProvider(),
      publicConfig: { collectorUrl: "/analytics/events" },
    }),
  ],
};
```

`collectorUrl` は公開してよい収集先 URL です。相対パスまたは HTTP(S) URL を指定し、JSON の `POST` を受け付ける収集側を用意します。将来のプロバイダパッケージは、非公開ランタイム設定を使ってその収集側を提供できます。

## ブラウザでの動作

Core の安定コンテンツ ID（frontmatter の `id`）がある公開コンテンツにだけ識別子マーカーを出力します。汎用 `publicConfig` 経由で登録された `initAnalytics` は、ブラウザでドキュメントごとに一度だけ次のようなイベントを送ります。

```json
{
  "type": "page_view",
  "contentId": "guide-1",
  "occurredAt": "2026-01-01T00:00:00.000Z",
  "path": "/guide",
  "lang": "ja"
}
```

`path` と `lang` は補助情報であり、ID ではありません。安定 ID のないコンテンツは誤って計測しません。ビルド時・SSR 時は何もせず、同じドキュメント内での初期化も冪等です。現行リポジトリは静的なドキュメント遷移のため SPA フックは追加しておらず、SPA 遷移は自動計測しません。

コンテンツ ID は執筆側の責務です。公開ノート間での `id` の重複は [`@riebeckite/plugin-diagnostics`](../diagnostics/README_ja.md) が報告し（`duplicate-content-id` / `invalid-content-id`）、プラグイン自身の `validateAnalyticsOptions` が `check` 時に検証します。

## プロバイダ契約

```ts
const result = await provider.query({
  type: "popular_content",
  limit: 10,
  timeRange: { from: "2026-01-01T00:00:00.000Z" },
});
```

機能（capability）は `capture`、`content_page_views`、`popular_content` です。すべてのクエリに対応しないプロバイダを実装する場合は、`assertAnalyticsQuerySupported(provider, query)` を呼び出してください。

## 診断

`@riebeckite/plugin-diagnostics` は、サイトで本プラグインが有効なとき、安定 content ID を持たない公開コンテンツを `analytics-untracked` として報告します。計測の抜けを `check` / `doctor` / build の診断で確認できます。

## 主なエクスポート

- `analytics()` / `analyticsPlugin()`
- `initAnalytics`（`@riebeckite/plugin-analytics/client`）
- `MemoryAnalyticsProvider`
- イベント、クエリ／結果、プロバイダ／機能、公開設定の型
- `UnsupportedAnalyticsQueryError` と機能確認ヘルパー

## 関連リンク

- [プラグイン API](../../../docs/docs/reference/plugin-api.ja.md)
