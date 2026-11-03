# Riebeckite Bridge Protocol v1

Bridge はエディタ連携用の開発時限定 API です。読み取り機能は標準で無効で、変更機能には別の明示的なCapabilityが必要です。32文字以上のペアリングトークンを明示してサイトを起動してください。

```sh
riebeckite dev --bridge-token <at-least-32-character-token>
```

開発サーバーの `GET /__riebeckite/bridge/bootstrap` に `x-riebeckite-bridge-token` を付けて要求すると、loopback 限定のプライベート origin を返します。その origin に対し、同じトークンと `x-riebeckite-bridge-protocol: 1` を付けて要求します。

`GET /__riebeckite/bridge/v1` は v1 の状態取得エンドポイントです。

```json
{
  "protocolVersion": 1,
  "server": { "id": "uuid", "version": "0.0.38" },
  "capabilities": ["status", "page-resolution"],
  "development": {
    "available": true,
    "revision": 0,
    "build": { "status": "unavailable" }
  },
  "inspection": { "available": false }
}
```

完了済みの開発ビルドがない間、`build` は `{ "status": "unavailable" }` です。`revision` は Bridge の状態 revision で、コンテンツ変更によって Bridge が無効化されるたびに増え、すべてのエンドポイントで同じ値を返します。`build.completedAt` はビルド時刻であり、Bridge の revision ではありません。

HonoX の開発連携がコンテンツルートを提供する場合、次の読み取り専用エンドポイントが追加 Capability として公開されます。

| エンドポイント | クエリ | 用途 |
| --- | --- | --- |
| `/__riebeckite/bridge/v1/source` | `path` | コンテンツのソースファイルを Manifest エントリに解決します。 |
| `/__riebeckite/bridge/v1/preview` | `path` | routable なエントリの実際のローカル開発 URL を返します。 |
| `/__riebeckite/bridge/v1/publication` | `path` | visibility、routing、公開、redirect の状態を返します。 |
| `/__riebeckite/bridge/v1/diagnostics` | `path` | ソースに関連する既存のコンテンツ診断を返します。 |
| `/__riebeckite/bridge/v1/impact` | `path` | 最後に完了したビルドから関連する出力を返します。 |
| `/__riebeckite/bridge/v1/events` | なし | 認証済み Server-Sent Events ストリームを開きます。 |
| `/__riebeckite/bridge/v1/page` | `source` | 1 ページ分の要約を返す Protocol v1 互換エイリアスです。 |

`path` は設定済みコンテンツルート配下の Markdown ソースを指定します。絶対パスはそのルート配下に解決される場合だけ受け付けます。応答は常にルート相対パスを使い、絶対ファイルシステムパスは返しません。解決処理はすべてのエンドポイントで共通です。パス、`.md` を除いたパス、Manifest の alias、content ID、permalink、`hello.md` のような一意な末尾一致を照合します。複数候補に一致した場合は `AMBIGUOUS_SOURCE` を伴う `unsupported` を返し、探索順で勝手に確定しません。

Source の状態は `resolved`、`not-found`、不正または曖昧なパスの `unsupported`、完了済みビルドがない場合の `unavailable` です。Manifest が未取得であることは、ページが存在しないことと同じではありません。

`GET /__riebeckite/bridge/v1/page?source=<Vaultからの相対Markdownパス>` は Obsidian クライアントが使う Protocol v1 互換エンドポイントです。`/source` と同じ解決処理を使い、フラットな要約を返します。

```json
{
  "status": "resolved",
  "source": "notes/hello.md",
  "page": "/ja/hello/",
  "visibility": "public",
  "routable": true,
  "discoverable": true,
  "locale": "ja",
  "publishAt": null,
  "revision": 0,
  "productionUrl": null
}
```

互換状態は `resolved`、`unavailable`、`not-found`、`invalid-source` です。曖昧なソースは理由付きの `unsupported` を返します。このエンドポイントは Protocol v1 の存続期間中は維持し、クライアントが `/source`、`/publication`、`/preview` へ移行した後の将来の非互換 Protocol Version でのみ削除します。Manifest の解決処理は共通化しており、重複実装はありません。

Preview は公開境界を越えません。公開可能な経路を持たない draft と scheduled は `NOT_PUBLICLY_ROUTABLE` を返します。Bridge が返すのはローカル開発 URL だけです。本番 URL は設定済みの `site.baseUrl` から解決する場合だけ返し、推測・生成はしません。Diagnostics の位置情報は Riebeckite が保持するものだけです。Build impact は dry-run の予測ではなく最後のビルド結果です。完全再生成が必要だった場合、`completeness` は `unknown` になります。

イベントストリームは最初に現在の revision とビルド状態を含む `state` を送り、開発時のコンテンツ監視が Bridge を無効化するたびに revision を増やした `content.changed` を送ります。イベント後は必要なエンドポイントを再取得してください。

プライベートリスナーは `127.0.0.1` だけに bind し、非 loopback の Host・接続、`Origin`、転送ヘッダーを拒否します。CORS は有効にしません。トークン不正は 403、Protocol 非互換は `INCOMPATIBLE_PROTOCOL` と対応 Version を含む 426 です。トークンを API 応答に含めることもありません。

変更APIは、読み取りトークンに加えて32文字以上の `--bridge-mutation-token` を明示した場合だけ有効です。読み取りトークンはPlanの作成にしか使えず、承認・適用には使えません。Planはサーバー内に固定され、Mutationトークンで承認すると5分間だけ一回限りの承認IDが発行されます。Applyは既存のfingerprint、lock、journal、backup、パス検証を利用します。

RecoveryとRollbackは、破壊操作用の独立した承認契約が未完成のためBridgeには公開せず、CLI専用のままです。

将来の互換変更では任意フィールドと Capability だけを追加します。v1 のフィールドを変更・削除する変更は、新しい Protocol Version と endpoint を使います。
