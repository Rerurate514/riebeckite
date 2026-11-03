# Riebeckite Bridge Protocol v1

Bridge はエディタ連携用の開発時限定・読み取り専用 API です。標準では無効です。32 文字以上のペアリングトークンを明示してサイトを起動してください。

```sh
riebeckite dev --bridge-token <at-least-32-character-token>
```

開発サーバーの `GET /__riebeckite/bridge/bootstrap` に `x-riebeckite-bridge-token` を付けて要求すると、loopback 限定のプライベート origin を返します。その origin に対し、同じトークンと `x-riebeckite-bridge-protocol: 1` を付けて要求します。

`GET /__riebeckite/bridge/v1` は v1 の状態取得エンドポイントとして維持されます。サーバー ID、Protocol Version、Capability、現在の revision、最後に完了したビルドの状態を返します。既存クライアントは変更なく利用できます。

HonoX の開発連携がコンテンツルートを提供する場合、次の読み取り専用エンドポイントが任意 Capability として追加されます。

| エンドポイント | クエリ | 用途 |
| --- | --- | --- |
| `/__riebeckite/bridge/v1/source` | `path` | コンテンツのソースファイルを Manifest エントリに解決します。 |
| `/__riebeckite/bridge/v1/preview` | `path` | routable なエントリの実際のローカル開発 URL を返します。 |
| `/__riebeckite/bridge/v1/publication` | `path` | visibility、routing、公開、redirect の状態を返します。 |
| `/__riebeckite/bridge/v1/diagnostics` | `path` | ソースに関連する既存のコンテンツ診断を返します。 |
| `/__riebeckite/bridge/v1/impact` | `path` | 最後に完了したビルドから関連する出力を返します。 |
| `/__riebeckite/bridge/v1/events` | なし | 認証済み Server-Sent Events ストリームを開きます。 |

`path` は設定済みコンテンツルート配下の Markdown ソースを指定します。絶対パスはそのルート配下に解決される場合だけ受け付けます。応答は常にルート相対パスを使い、絶対ファイルシステムパスは返しません。Source の状態は `resolved`、`not-found`、不正パスの `unsupported`、完了済みビルドがない場合の `unavailable` です。

Preview は公開境界を越えません。公開可能な経路を持たない draft と scheduled は `NOT_PUBLICLY_ROUTABLE` を返します。Bridge が返すのはローカル開発 URL だけで、本番 URL を推測・生成しません。Diagnostics の位置情報は Riebeckite が保持するものだけです。Build impact は dry-run の予測ではなく最後のビルド結果です。完全再生成が必要だった場合、`completeness` は `unknown` になります。

イベントストリームは最初に `state` を送り、開発時のコンテンツ監視が Bridge を無効化するたびに revision を増やした `content.changed` を送ります。イベント後は必要なエンドポイントを再取得してください。

プライベートリスナーは `127.0.0.1` だけに bind し、非 loopback の Host・接続、`Origin`、転送ヘッダーを拒否します。CORS は有効にしません。トークンを API 応答に含めることもありません。トークン不正は 403、Protocol 非互換は `INCOMPATIBLE_PROTOCOL` と対応 Version を含む 426 です。

書き換え、ファイル操作、コマンド実行、本番向けのエンドポイントはありません。既存のコンテンツ変更 API をネットワークに公開するには、別途サーバー側の認可と承認モデルが必要です。

将来の互換変更では任意フィールドと Capability だけを追加します。v1 のフィールドを変更・削除する変更は、新しい Protocol Version と endpoint を使います。
