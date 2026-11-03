# Riebeckite Bridge Protocol v1

Bridgeはエディタ連携用の開発時限定・読み取り専用APIです。標準では無効です。32文字以上の
ペアリングトークンを明示してサイトを起動してください。

```sh
riebeckite dev --bridge-token <token>
```

開発サーバーの `GET /__riebeckite/bridge/bootstrap` へ
`x-riebeckite-bridge-token` を付けて要求すると、loopback限定のプライベートoriginを返します。
そのoriginの `GET /__riebeckite/bridge/v1` には、同じトークンと
`x-riebeckite-bridge-protocol: 1` を付けます。

応答にはProtocol Version、サーバーIDとRiebeckite Version、実装済みCapabilities、開発ビルドの
revisionと状態、Inspectionの利用可否が含まれます。ビルド完了前の `build` は
`{ "status": "unavailable" }` です。v1が返すCapabilityは `status` だけです。トークン不正は403、
Protocol非互換は `INCOMPATIBLE_PROTOCOL` を含む426です。

プライベートリスナーは `127.0.0.1` にだけbindし、非loopbackのHost・接続、`Origin`、転送ヘッダーを
拒否します。CORSは有効にしません。コンテンツ、Diagnostics、書き換え、公開、Preview、ファイル操作、
コマンド実行のendpointはありません。トークンをAPI応答に含めることもありません。

将来の互換変更では任意フィールドとCapabilityだけを追加します。v1のフィールドを変更・削除する変更は
新しいProtocol Versionとendpointを使います。
