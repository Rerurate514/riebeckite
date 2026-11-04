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

コンテンツルートを持つ場合の Capability には `seo` を含みます。これは publication 応答に、以下で説明する任意の `seo` ブロックが含まれることを示します。

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

Publication 応答では、`entry` と `publication` の両方に `publishAt` を含めます。未設定の場合は `null`、設定済みの場合は ISO 8601 文字列です。設定済みの `site.baseUrl` とエントリの permalink から解決した `canonicalUrl` も含めます。有効な public origin がない場合は `null` です。任意の `seo` ブロックは、解決済みコンテンツ Manifest のエントリだけから導出します。

```json
{
  "seo": {
    "title": "Hello",
    "description": "A short description.",
    "canonicalUrl": "https://example.com/ja/hello/",
    "indexable": true,
    "issues": []
  }
}
```

`indexable` は discoverable かつ公開済みのコンテンツだけで `true` です。`issues` は安定した順序で返し、`MISSING_DESCRIPTION`、`DESCRIPTION_TOO_LONG`（120文字超）、`TITLE_TOO_LONG`（60文字超）、`NOT_INDEXABLE` を含む場合があります。

イベントストリームは最初に現在の revision とビルド状態を含む `state` を送り、開発時のコンテンツ監視が Bridge を無効化するたびに revision を増やした `content.changed` を送ります。イベント後は必要なエンドポイントを再取得してください。

プライベートリスナーは `127.0.0.1` だけに bind し、非 loopback の Host・接続、`Origin`、転送ヘッダーを拒否します。CORS は有効にしません。トークン不正は 403、Protocol 非互換は `INCOMPATIBLE_PROTOCOL` と対応 Version を含む 426 です。トークンを API 応答に含めることもありません。

変更 API は、開発サーバーの起動前に32文字以上で互いに異なる `RIEBECKITE_BRIDGE_MUTATION_TOKEN` と `RIEBECKITE_BRIDGE_MUTATION_APPROVAL_TOKEN` を環境変数として設定した場合だけ有効です。コマンドライン引数に秘密情報を渡さないため、プロセス引数に露出しません。読み取りトークンは Plan を作成できるだけです。Mutation Token は承認済み Plan を適用できますが、承認できません。`POST /__riebeckite/bridge/v1/mutations/plan` は既存の Content Mutation Operation を受け取り、元の `ContentMutationPlan` を返します。人間は対話端末で `riebeckite bridge approve <plan-id>` を実行し、永続化された Plan を確認してから承認します。サーバーは承認トークンで署名された Plan ID と内容ハッシュ、5分の期限、一回限りの使用状態を検証してから `POST /mutations/<plan-id>/apply` を実行します。承認トークンと Bearer 型の承認 ID は HTTP、URL、API 応答に渡しません。Apply は既存の fingerprint、lock、journal、backup、パス検証を利用します。承認または fingerprint の検証で Apply が拒否された場合は、既存の conflict 結果とともに HTTP 409 を返します。

Recovery と Rollback は CLI 専用のままです。journal と backup を使ってコンテンツを復元・削除する破壊操作であり、エディタ Capability に journal 選択を公開すると別の破壊 API になります。既存の `riebeckite content recover <journal> --apply` は Engine 側の journal、backup、fingerprint、パス、競合検証を維持します。

将来の互換変更では任意フィールドと Capability だけを追加します。v1 のフィールドを変更・削除する変更は、新しい Protocol Version と endpoint を使います。
