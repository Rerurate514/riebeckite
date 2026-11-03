# Riebeckite Bridge Protocol v1

Bridge はエディタ連携用の開発時限定 API です。読み取り機能は標準で無効で、変更機能には別の明示的なCapabilityが必要です。32文字以上のペアリングトークンを明示してサイトを起動してください。

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

変更 API は、開発サーバーの起動前に32文字以上で互いに異なる `RIEBECKITE_BRIDGE_MUTATION_TOKEN` と `RIEBECKITE_BRIDGE_MUTATION_APPROVAL_TOKEN` を環境変数として設定した場合だけ有効です。コマンドライン引数に秘密情報を渡さないため、プロセス引数に露出しません。読み取りトークンは Plan を作成できるだけです。Mutation Token は承認済み Plan を適用できますが、承認できません。`POST /__riebeckite/bridge/v1/mutations/plan` は既存の Content Mutation Operation を受け取り、元の `ContentMutationPlan` を返します。人間は対話端末で `riebeckite bridge approve <plan-id>` を実行し、永続化された Plan を確認してから承認します。サーバーは承認トークンで署名された Plan ID と内容ハッシュ、5分の期限、一回限りの使用状態を検証してから `POST /mutations/<plan-id>/apply` を実行します。承認トークンと Bearer 型の承認 ID は HTTP、URL、API 応答に渡しません。Apply は既存の fingerprint、lock、journal、backup、パス検証を利用します。

Recovery と Rollback は CLI 専用のままです。journal と backup を使ってコンテンツを復元・削除する破壊操作であり、エディタ Capability に journal 選択を公開すると別の破壊 API になります。既存の `riebeckite content recover <journal> --apply` は Engine 側の journal、backup、fingerprint、パス、競合検証を維持します。

将来の互換変更では任意フィールドと Capability だけを追加します。v1 のフィールドを変更・削除する変更は、新しい Protocol Version と endpoint を使います。
