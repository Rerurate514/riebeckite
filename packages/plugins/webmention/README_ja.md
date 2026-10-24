# @riebeckite/plugin-webmention

<!-- Generated from docs/docs/plugins/webmention.ja.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Webmention を受信し、送信元ドキュメントが本当にターゲットへリンクしているかを検証し、差し替え可能なプロバイダー経由で保存して、検証済みのメンションを記事の近くに表示します。コアプラグインには **Cloudflare・Worker・データベース・ベンダー固有のコードは一切なく**、依存は `@riebeckite/core` だけです。

[English](./README.md)

## 設計

- `WebmentionProvider` がストレージとランタイムの境界です。`store` / `query` のケイパビリティを公開し、`store(mention)` と `query(query)` を持ちます。認証情報・データベースハンドル・実行時バインディングはアダプター内に留まり、プラグインの options や生成物へ漏れません。
- `MemoryWebmentionProvider` はテスト・ローカルプレビュー・プロバイダーの実装例として同梱されています。プロセスや isolate をまたいで永続化はしません。
- プラグインは `endpoints` を宣言します。`POST {endpoint}` が Webmention を受信し、`GET {endpoint}` が検証済みメンションのフィードを返します。ルートフレームワークの詳細はこのパッケージへ入りません。HonoX 連携（`mountRiebeckiteEndpoints`）がエンドポイントをホストルーターへマウントします。
- 検証は注入可能な `WebmentionSourceFetcher` を通じて送信元を取得し、ターゲットへの発リンクを確認したうえで、軽量な引用メタデータ（title・excerpt・author・公開日・`rel` 由来の種別）を記録します。既定のフェッチャーはループバックとプライベートネットワーク宛てを拒否し、本文サイズを制限し、タイムアウトします。

## 使い方

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
