# Analytics

Riebeckite のアクセス解析は、ストレージに依存しない plugin と、イベントを受け取って保存する独立した Cloudflare Worker の二つのパッケージに分かれています。

- **`@riebeckite/plugin-analytics`** — plugin 本体と provider / query の契約。Cloudflare、Worker、データベース、特定ベンダーの実装は含みません。
- **`@riebeckite/analytics-cloudflare`** — Cloudflare 向けの Worker 実行環境。D1/KV ストレージ、リクエスト検証、CORS、読み取り用 API を担当します。

サイト本体はこれまで通り静的ビルドのままです。analytics Worker は独立したデプロイであり、静的サイトの `wrangler.jsonc` や main を置き換えません。

## 計測の仕組み

1. **安定 content ID。** ブラウザの初期化処理は、frontmatter に source-authored な安定 `id` を持つコンテンツだけを計測します（互換用の `uid` も受け付けます）。詳細は [Content System](./content-system.md#安定-content-id) を参照してください。
2. **マーカー。** ビルド時に、content ID を持つ公開エントリへ隠し要素 `<span data-riebeckite-content-id="...">` を追加します。
3. **ブラウザイベント。** `initAnalytics` はドキュメントごとに一度だけ実行され、マーカーを読んで、設定された `collectorUrl` へ JSON の `page_view` イベントを `POST` します。

```json
{
  "type": "page_view",
  "contentId": "guide-1",
  "occurredAt": "2026-01-01T00:00:00.000Z",
  "path": "/guide",
  "lang": "en"
}
```

`path` と `lang` は補助的なメタデータであり、ID ではありません。安定 ID のないコンテンツは計測されません。現状の Riebeckite は静的ドキュメント遷移でページ読み込みごとに再取得されるため、`page_view` はページロードにつき 1 件が正しいモデルです。SPA のルート遷移は自動計測しません。

## サイトの設定

```ts
import { analytics, MemoryAnalyticsProvider } from "@riebeckite/plugin-analytics";

export default defineConfig({
  // ...
  plugins: [
    analytics({
      provider: new MemoryAnalyticsProvider(),
      publicConfig: { collectorUrl: "https://analytics.example.com/events" },
    }),
  ],
});
```

- `provider` は `AnalyticsProvider` 契約（`capabilities`、`capture`、`query`）を実装した非公開のランタイムです。認証情報やバインディングは provider 内部に保持します。
- `publicConfig.collectorUrl` は意図的に公開される、ブラウザへ渡す唯一の設定です。site-relative path か JSON `POST` を受け付ける HTTP(S) URL を指定します。
- `MemoryAnalyticsProvider` はテスト・ローカル実験用です。本番では Cloudflare Worker などの実コレクタを使ってください。

plugin オプションは通常の設定検証に含まれるため、不正な `provider` や `collectorUrl` は `riebeckite check` や `doctor` で報告されます。

### Provider 契約

`AnalyticsProvider` は対応機能（`capture`、`content_page_views`、`popular_content`）を宣言します。`capture(event)` は page view を保存し、`query(query)` は次の二つの読み取り形状を実行します。

```ts
// 1 件のコンテンツの合計ビュー数（任意の ISO 8601 期間つき）
await provider.query({
  type: "content_page_views",
  contentId: "guide-1",
  timeRange: { from: "2026-01-01T00:00:00.000Z" },
});

// ランキング（任意の limit と期間つき）
await provider.query({ type: "popular_content", limit: 10 });
```

対応していないクエリには `UnsupportedAnalyticsQueryError` を投げます。独自 provider を実装する場合は `assertAnalyticsQuerySupported(provider, query)` を呼び出してください。capability / query ヘルパーは package root からエクスポートされています。

## Cloudflare Worker でイベントを集める

`@riebeckite/analytics-cloudflare` は `createWorker(options)` と二つのストレージアダプタを公開します。既定アダプタはなく、必ず一つだけ選びます。

| アダプタ | 対応機能 | 備考 |
| --- | --- | --- |
| `D1AnalyticsStorage` / `d1Storage(db)` | capture、コンテンツ別合計、人気ランキング、日バケット期間 | SQLite の原子的 upsert で UTC 日単位に集計。生イベントは保存しません。 |
| `KvAnalyticsStorage` / `kvStorage(namespace)` | capture のみ | ベストエフォート集計。同時書き込みで欠損し得るため、`content_page_views` / `popular_content` は `501` を返します。 |

```ts
import { createWorker, d1Storage } from "@riebeckite/analytics-cloudflare";

export interface Env { ANALYTICS_DB: D1Database; }

export default {
  fetch(request: Request, env: Env) {
    return createWorker({
      storage: d1Storage(env.ANALYTICS_DB),
      cors: { allowedOrigins: ["https://www.example.com"] },
    }).fetch(request);
  },
};
```

`env` は `fetch` 内でしか存在しないため、バインディングはリクエストごとに構築します。

### エンドポイント

- `POST /events` — JSON の `page_view` ペイロード（最大 8 KiB）を受け付け、`204` を返します。不正な JSON、未知のフィールド、安全でない文字列、JSON 以外の content type は `400`/`415`、大きすぎるボディは `413` で拒否します。
- `GET /content/:contentId/page-views?from=&to=` — コンテンツ別の合計。
- `GET /popular?limit=&from=&to=` — 人気ランキング。

読み取り API は、ストレージアダプタが対応機能を宣言している場合にだけ利用できます。Origin は既定で拒否されるため、明示的に `allowedOrigins` を設定してください。`"any"` は意図的に公開するコレクタだけに使います。IP、Cookie、User-Agent、フィンガープリントは読み取らず保存もしません。`path` / `lang` は補助情報であり、D1 は保存しません。

### デプロイ

D1 schema はリクエスト中に実行せず、必ずデプロイ前に明示適用してください。

```sh
pnpm exec wrangler d1 execute ANALYTICS_DB --file node_modules/@riebeckite/analytics-cloudflare/migrations/0001_analytics_page_views.sql
pnpm exec wrangler deploy
```

`templates/analytics-cloudflare/d1` または `templates/analytics-cloudflare/kv` を独立した Worker ディレクトリ／リポジトリへコピーします。どちらも専用の `main` を持ち、静的 Riebeckite サイトの `wrangler.jsonc` や main を置き換えてはいけません。サイトの `collectorUrl` にはデプロイされた Worker の `/events` を指定してください。

## 診断

`@riebeckite/plugin-diagnostics` は、設定で analytics プラグインが有効なとき、安定 content ID を持たない公開ノートを `analytics-untracked`（info）として報告します。計測の抜けを `check` / `doctor` / build の診断ですぐ確認でき、コンテンツを変更することはありません。契約の詳細は [Diagnostics](./diagnostics.md) を参照してください。

## 関連資料

- [Content System](./content-system.md#安定-content-id) — 安定 content ID
- [Diagnostics](./diagnostics.md) — structured finding と `check` / `doctor`
- [Framework Reference](./framework-reference.md) — 公開パッケージの一覧
- [HonoX Integration](./honox-integration.md) — この Worker の隣で動く静的サイトのビルド
- [Usage Guide](./guide.md) — 静的サイトのデプロイ