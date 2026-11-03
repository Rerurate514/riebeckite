# @riebeckite/plugin-webmention

<!-- Generated from docs/docs/plugins/webmention.ja.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Webmention を受信し、送信元ドキュメントが本当にターゲットへリンクしているかを検証し、差し替え可能なプロバイダー経由で保存して、検証済みのメンションを記事の近くに表示します。コアプラグインには **Cloudflare・Worker・データベース・ベンダー固有のコードは一切なく**、`@riebeckite/core`・`@riebeckite/ui`・`hono` と、Node での DNS 固定接続に使う `undici` を利用します。

[English](./README.md)

## できること

- `POST /webmentions` で Webmention を受け付けます。
- 送信元ページを取得し、ターゲットへのリンクを確認してから保存します。
- プロバイダー経由でメンションを保存します。既定はインメモリです。
- `GET /webmentions` で JSON フィードを返します。
- `WebmentionSection` で検証済みメンションを表示します。

読者が自分のサイトから記事へリンクし、そのメンションを自分のサイトに集めたいときに使います。送信側が Webmention に対応している必要があり、このプラグインがメンションを自動 discovery することはありません。

## クイックスタート

1. プラグインをインストールします。

```sh
npm install @riebeckite/plugin-webmention
```

2. プラグインを有効にします。

```ts
import { defineConfig } from "@riebeckite/core";
import { webmention } from "@riebeckite/plugin-webmention";

export default defineConfig({
  plugins: [webmention()],
});
```

プロバイダーを省略するとメンションはインメモリに保存されます。ローカルでエンドポイントを試すには十分ですが、プロセスを再起動すると失われます。

3. エンドポイントをマウントします。スキャフォールドの `app/server.ts` はすでに `mountRiebeckiteEndpoints` を呼んでいます。独自のサーバーを使う場合は、プラグインのエンドポイントをそこへマウントしてください。[HTTP エンドポイントの追加](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/plugins/recipes/endpoints.ja.md) を参照してください。

4. 開発サーバーを起動し、フィードを確認します。

```sh
npm exec riebeckite dev
curl http://localhost:5173/webmentions
```

ポートは `dev` が表示します。メンションがない場合、フィードは `count: 0` の封筒を返します。

5. 記事へリンクしているページから Webmention を送ります。手動の `curl` はエラー応答の確認には便利ですが、送信元ページが実際にターゲットへリンクしていない限り拒否されます。

```sh
curl -i -X POST http://localhost:5173/webmentions \
  -H "Content-Type: application/json" \
  -d '{"source":"https://example.com/post","target":"https://example.com/your-article"}'
```

6. 記事の近くにメンションを表示します。後述の「記事近くのメンション表示」を参照してください。

## 仕組み

- `WebmentionProvider` がストレージとランタイムの境界です。`store` / `query` のケイパビリティを公開し、`store(mention)` と `query(query)` を持ちます。認証情報・データベースハンドル・実行時バインディングはアダプター内に留まり、プラグインの options や生成物へ漏れません。
- `MemoryWebmentionProvider` はテスト・ローカルプレビュー・プロバイダーの実装例として同梱されています。プロセスや isolate をまたいで永続化はせず、最大 1,000 件のメンションを保持して、それを超えると古いものから削除します。
- プラグインは `endpoints` を宣言します。`POST {endpoint}` が Webmention を受信し、`GET {endpoint}` が検証済みメンションのフィードを返します。ルートフレームワークの詳細はこのパッケージへ入りません。HonoX 連携（`mountRiebeckiteEndpoints`）がエンドポイントをホストルーターへマウントします。
- 検証は注入可能な `WebmentionSourceFetcher` を通じて送信元を取得し、ターゲットへの発リンクを確認したうえで、軽量な引用メタデータ（title・excerpt・author・公開日・`rel` 由来の種別）を記録します。既定のフェッチャーは HTTP(S) だけを受け付け、認証情報を拒否し、リダイレクトと本文サイズを制限し、タイムアウトし、DNS 解決後にループバックとプライベートネットワーク宛てを拒否します。DNS 解決に失敗した場合は取得を拒否し、検証済みのアドレスを接続に固定します。DNS モジュールのないランタイムでは、ホスト名とリテラル IP の検証だけが適用されます。

## 本番用のストレージ

インメモリのプロバイダーは永続化しません。本番では Cloudflare アダプターを使い、デプロイ前に D1 スキーマを適用してください。

```sh
pnpm exec wrangler d1 execute WEBMENTION_DB --file node_modules/@riebeckite/webmention-cloudflare/migrations/0001_webmentions.sql
```

次の `env` バインディングは Worker ランタイムが提供します。完全な配線は [Cloudflare 連携の README](https://github.com/Rerurate514/riebeckite/blob/main/packages/integrations/webmention-cloudflare/README_ja.md) を参照してください。

```ts
import { webmention } from "@riebeckite/plugin-webmention";
import { d1Storage } from "@riebeckite/webmention-cloudflare";

export default {
  plugins: [
    webmention({ provider: d1Storage(env.WEBMENTION_DB) }),
  ],
};
```

プロバイダーを省略するとインメモリのプロバイダーが使われます。ローカルプレビューには十分ですが、プロセスをまたぐとメンションは失われます。本番では永続アダプター（[`@riebeckite/webmention-cloudflare`](https://github.com/Rerurate514/riebeckite/blob/main/packages/integrations/webmention-cloudflare/README_ja.md) を参照）を指定してください。

## エンドポイント

| メソッド | パス                       | 動作 |
| ------ | -------------------------- | ---- |
| `POST` | `/webmentions`（既定）      | `source` と `target` を含む `application/x-www-form-urlencoded` または `application/json` を受け付けます。受理時は `202`、拒否時は `error` コード付きの `400`、ストレージ不能時は `503` を返します。 |
| `GET`  | `/webmentions`（既定）      | 検証済みメンションのフィードを JSON（`{ version, generatedAt, count, mentions }`）で返します。`?target=`・`?limit=`・`?since=` に対応。query に対応しないプロバイダーでは `501` を返します。 |

拒否コード: `invalid_request`、`missing_source_or_target`、`target_not_found`、
`invalid_source`、`invalid_target`、`source_unreachable`、`no_link_found`。

`POST` は 64 KiB を超える本文に `413` と `payload_too_large` を返します。また、クライアントごとに 1 分あたり 30 リクエストまで許可し、利用可能なプロキシヘッダー（`cf-connecting-ip`、`x-real-ip`、`x-forwarded-for` の順）または共有の `unknown` バケットで識別し、超過時は `429` と `Retry-After: 60` を返します。この制限はプロセス・isolate 単位のベストエフォートであり、公開環境では認証やエッジでのレート制限を追加してください。

## 記事近くのメンション表示

サイトが JSX の配置を所有します。プロバイダーのインスタンスはサイトの構成で保持し、同じインスタンスを `webmention()` へ渡してから、`getWebmentionSectionData` でコンポーネントの型付き props を取得します。ヘルパーは `PublicContentView` を受け取るため、draft と scheduled のエントリは描画できません。

```tsx
const mentions = await getWebmentionSectionData({
  view,
  slug,
  config,
  provider: webmentionProvider,
});

<WebmentionSection {...mentions} />
```

空のプロバイダーは空のモデルを返し、`WebmentionSection` は何も描画しません。プラグインはビルド時にマニフェストの HTML を注入しません。より低レベルな query が必要な場合は、`getWebmentionsForEntry({ manifest, config, provider, slug })` を直接呼ぶか、JSON フィードを利用できます。

## オプション

| オプション | 既定値 | 説明 |
| ---------- | ------ | ---- |
| `provider` | インメモリ | `WebmentionProvider` を実装するストレージアダプター。 |
| `endpoint` | `"/webmentions"` | 受信（POST）とフィード（GET）のパス。 |
| `headingText` | `"Mentions"` | 表示セクションの見出し。 |
| `limit` | `20` | 記事ごとに表示する最大メンション数。 |
| `className` | `"rr-webmention"` | 表示セクションのルート CSS クラス。 |
| `allowedTargets` | `[]` | 公開エントリ以外で受理する絶対ターゲット URL。 |
| `fetchSource` | グローバル `fetch` | 送信元フェッチャーの差し替え（テスト・独自ランタイム）。 |
| `timeoutMs` | `10000` | 送信元取得のタイムアウト。 |
| `maxBytes` | `1000000` | 受理する送信元ドキュメントの最大サイズ。 |
| `userAgent` | プラグイン既定 | 検証時の `User-Agent`。 |
| `allowPrivateHosts` | `false` | プライベートネットワーク宛ての取得を許可します。 |
| `nofollow` | `true` | 表示する送信元リンクへ `rel="nofollow ugc"` を付与します。 |

ブラウザへ渡るのは JSON 安全な値だけです。このプラグインはクライアントエントリも `publicConfig` も登録せず、プロバイダーの認証情報は options に入りません。

## 診断

`addDiagnostics` はプロバイダーのケイパビリティ不足（`webmention-render-requires-query`、`webmention-receive-requires-store`）を報告します。マニフェスト生成時、公開エントリに一致しないターゲットのメンションは `webmention-unmatched-target` として報告されます。

## エクスポート

- `webmention()` / `webmention()`
- `MemoryWebmentionProvider`、プロバイダーとケイパビリティの型およびエラー
- `parseWebmentionSource`、`findTargetLink`、`verifyWebmention`、
  `createWebmentionSourceFetcher`
- `WebmentionSection`、`getWebmentionSectionData`、`getWebmentionsForEntry`、
  `groupMentionsBySlug`、
  `buildFeed`
- `resolveWebmentionOptions`、`validateWebmentionOptions`

## 関連

- [プラグインガイド](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.ja.md)
- [@riebeckite/webmention-cloudflare](https://github.com/Rerurate514/riebeckite/blob/main/packages/integrations/webmention-cloudflare/README_ja.md)
