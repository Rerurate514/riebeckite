---
date: 2026-11-22
title: ブリッジ API
sidebar.label: ブリッジ API
sidebar.order: 36
---
# ブリッジ API

ブリッジは、`riebeckite dev` が `riebeckiteBridge` Vite プラグイン経由で公開するループバック専用の HTTP インターフェースです。MCP サーバー、エディタ、その他のツールが動作中のサイトを調べたり、コンテンツの変更を段階的に適用したりできます。公開サイトの一部ではなく、他のマシンからのリクエストは一切受け付けません。

## ブリッジを有効にする

32文字以上のトークンを指定してプラグインをエクスポートします。

```ts
import { riebeckiteBridge } from "@riebeckite/dev-inspector";

export default riebeckiteBridge({
  token: process.env.RIEBECKITE_BRIDGE_TOKEN!,
  contentRoot: "content",
});
```

有効なトークンがない場合、プラグインは何もしません。コンテンツの変更には `mutationToken` と `mutationApprovalToken` がさらに必要です。どちらも32文字以上で、互いに異なる値にします。未設定の間、mutation エンドポイントは `404` を返します。`riebeckite ai mcp --mutations` はこの2つのトークンをセッション用に自動生成します。

## 接続する

ブリッジ本体はランダムなポートで待機する専用のループバックサーバーで動きます。クライアントはまず開発サーバーに origin を問い合わせます。

```bash
curl -H "x-riebeckite-bridge-token: $RIEBECKITE_BRIDGE_TOKEN" \
  http://127.0.0.1:5173/__riebeckite/bridge/bootstrap
# → {"origin":"http://127.0.0.1:51731"}
```

以降のリクエストはこの origin 配下の `/__riebeckite/bridge/v1` に送ります。MCP サーバーはこのハンドシェイクを代わりに行います。詳しくは [MCP サーバー](../guides/ai/mcp.ja.md) を参照してください。

## リクエストの取り決め

すべてのリクエストに、次の2つのヘッダーが必須です。

| ヘッダー | 値 |
| --- | --- |
| `x-riebeckite-bridge-token` | ブリッジトークン |
| `x-riebeckite-bridge-protocol` | `1` |

受け付けるのはループバック接続だけです。`Origin` ヘッダーや `Forwarded` / `X-Forwarded-*` / `X-Real-IP` ヘッダー付きのリクエストは拒否されるため、ブラウザやプロキシからブリッジを呼ぶことはできません。トークンの比較は一定時間で行われます。レスポンスは `application/json; charset=utf-8` で、`cache-control: no-store` です。例外は `/v1/events` だけで、こちらは `text/event-stream` を流します。JSON リクエストボディはオブジェクトである必要があり、上限は1MiBです。

## エンドポイント

| エンドポイント | クエリ | 役割 |
| --- | --- | --- |
| `GET /v1` | — | サーバーの識別情報、capabilities、ビルド状態 |
| `GET /v1/page` | `source` | ページを解決する（Obsidian 互換） |
| `GET /v1/source` | `path` | コンテンツのソースファイルを解決する |
| `GET /v1/preview` | `path` | ソースのプレビュー情報 |
| `GET /v1/publication` | `path` | ソースの公開情報 |
| `GET /v1/diagnostics` | `path`、`since` | サイト全体または特定ソースの診断 |
| `GET /v1/impact` | `path` | ソースのビルドへの影響 |
| `GET /v1/context` | `path` | ソースの周辺コンテキスト |
| `GET /v1/links` | `path` | ソースのリンク |
| `GET /v1/content` | `path` | ソースの本文を読む（1MiB以下） |
| `GET /v1/inventory` | `offset`、`limit`、`query` | ページングされたコンテンツ一覧 |
| `GET /v1/schema` | — | 機械可読なエンドポイント摘要 |
| `GET /v1/events` | — | サーバー送信イベント |

### ステータス

`GET /v1` はプロトコルのバージョン、サーバーの識別情報、capabilities、ビルド状態を返します。

```json
{
  "protocolVersion": 1,
  "server": { "id": "…", "version": "…" },
  "capabilities": ["status", "site-identity", "…"],
  "development": {
    "available": true,
    "revision": 7,
    "build": { "status": "ready", "completedAt": "…" }
  },
  "inspection": { "available": true },
  "identity": {
    "siteId": "…",
    "siteName": "…",
    "contentRootId": "…",
    "contentSourceKind": "integrated"
  }
}
```

他のエンドポイントを呼ぶ前に `capabilities` を確認してください。`contentRoot` なしでサーバーが動いている場合、残るのは `status` と `page-resolution` だけです。

### インベントリ

`query` は slug と title での絞り込みです。大小文字を区別せず、部分一致で判定します。`offset` の既定値は 0、`limit` の既定値は 100 で、上限は 500 です。レスポンスは `{ entries, page: { offset, limit, total }, revision }` の形です。

### スキーマ

`GET /v1/schema` は `inventory`・`diagnostics`・`links`・`content` のクエリパラメータと、`mutations/validate` のリクエストボディを返します。クライアントを実装するときは、このページよりもこちらを優先してください。

### イベント

`GET /v1/events` は SSE のストリームです。接続時に `event: state` と `{ revision, build }` を、コンテンツが変わるたびに `event: content.changed` と `{ revision }` を流します。

## コンテンツの変更

3つの mutation エンドポイントは [コンテンツ変更](../framework/content-mutation.ja.md) で説明する Plan フローを通じて書き込みを段階的に進めます。人が `riebeckite bridge approve <plan-id>` で承認するまで、何も書き込まれません。

| エンドポイント | mutation トークンヘッダー | 効果 |
| --- | --- | --- |
| `POST /v1/mutations/validate` | 不要 | dry-run のみ。何も書かない |
| `POST /v1/mutations/plan` | 必須 | `<content>/.riebeckite/mutations/plans/` に Plan を保存 |
| `POST /v1/mutations/<planId>/apply` | 必須 | 承認済みの Plan を適用 |

3つとも `content-type: application/json` で `{ "operations": [...] }`（`ContentMutationOperation` の配列）を受け取り、`ContentMutationPlan` を返します。`operations` が空配列または配列でない場合、レスポンスは `400 INVALID_OPERATIONS` になります。

`validate` はブリッジトークンだけで呼べるため、読み取り専用クライアントでも使えます。`plan` はハッシュ付きの Plan を保存して返し、`apply` は承認済みの Plan を適用します。成功も拒否も Plan の JSON を返し、拒否の場合はステータス `409` と `applied: false` になります。

| `reason` | 意味 |
| --- | --- |
| `plan-not-found` | その id の Plan がない |
| `approval-required` | Plan がまだ承認されていない |
| `approval-invalid` | 承認の署名またはハッシュの検証に失敗した |
| `approval-used` | 承認はすでに使われた |
| `approval-expired` | 承認の有効期限（5分）を過ぎた |
| `approval-claim-conflict` | 承認を排他的に取得できなかった |

承認の有効期限は5分で、使えるのは1回だけです。人がターミナルで Plan（id、ハッシュ、変更点、警告）を確認し、`y` と入力すると、署名付きの承認ファイルが `<content>/.riebeckite/mutations/<planId>/` に書かれます。エディタは独自の承認・リカバリ・ロールバックを実装してはいけません（[エディタ統合](../guides/editor-integration.ja.md)）。

## ステータスコード

| ステータス | ボディ | 意味 |
| --- | --- | --- |
| `400` | `INVALID_REQUEST` または `INVALID_OPERATIONS` | JSON ボディが不正、または `operations` が空でない配列でない |
| `403` | なし | トークン不正、非ループバック接続、`Origin`/転送ヘッダーの検知 |
| `404` | なし | 未知のパス、または mutation トークン未設定サーバーへの mutation エンドポイント |
| `405` | なし | そのパスでは許可されないメソッド（POST は mutation エンドポイントのみ） |
| `409` | Plan の JSON | apply の拒否。`reason` を参照 |
| `415` | なし | POST で `content-type: application/json` 以外 |
| `426` | `INCOMPATIBLE_PROTOCOL` | `x-riebeckite-bridge-protocol` ヘッダーが不在または不整合 |
| `503` | `BRIDGE_UNAVAILABLE` または `BRIDGE_STATUS_UNAVAILABLE` | ブリッジの準備ができていない、またはコンテンツのスナップショットがまだない |

## 関連

- [コンテンツ変更](../framework/content-mutation.ja.md)
- [MCP サーバー](../guides/ai/mcp.ja.md)
- [エディタ統合](../guides/editor-integration.ja.md)
- [CLI: `bridge approve`](./cli.ja.md)
