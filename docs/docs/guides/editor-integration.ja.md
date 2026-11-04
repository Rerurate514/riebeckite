---
date: 2026-11-04
title: エディタ連携
sidebar:
  label: エディタ連携
---
# エディタ連携

Riebeckite は、エディタ拡張などのローカルツール向けに、開発時限定の Bridge を公開できます。Markdown のソースファイルを既存のコンテンツ Manifest に解決し、開発サーバーと同じ Preview、公開状態、Diagnostics、最後のビルドの影響範囲を返します。

開発サーバーはペアリングトークンを明示して起動します。

```sh
riebeckite dev --bridge-token <at-least-32-character-token>
```

このトークンがなければ Bridge は無効です。まず開発サーバーの `GET /__riebeckite/bridge/bootstrap` に `x-riebeckite-bridge-token` を付けて要求します。返された loopback origin に対して、同じトークンと `x-riebeckite-bridge-protocol: 1` を付けて Bridge を利用します。

対応する Capability は `GET /__riebeckite/bridge/v1` で確認します。エディタツールは `/source?path=notes/example.md` でソースを解決し、そのソースの Preview、公開状態、Diagnostics、最後のビルドの影響範囲を取得できます。`/events` を購読すると、コンテンツ変更後に再取得できます。Obsidian クライアント向けの `/page?source=notes/example.md` は Protocol v1 の互換エイリアスとして残しており、内部の解決処理は `/source` と共通です。新規の連携では `/source`、`/publication`、`/preview` を使用してください。

Bridge は標準では読み取り専用です。絶対ソースパスは返さず、routable でないコンテンツの非公開 Preview も提供せず、本番 URL を推測しません。変更機能には、それぞれ32文字以上で異なる `RIEBECKITE_BRIDGE_MUTATION_TOKEN` と `RIEBECKITE_BRIDGE_MUTATION_APPROVAL_TOKEN` の環境変数が必要です。クライアントは Plan を作成できますが、適用には対話端末での `riebeckite bridge approve <plan-id>` によるレビューが必要です。承認はサーバー側に保持され、5分で失効し、1回だけ使用できます。Recovery と Rollback は引き続き CLI 専用です。

リクエストと応答の仕様は [Bridge Protocol v1](https://github.com/Rerurate514/riebeckite/blob/main/packages/dev-inspector/BRIDGE_ja.md) を参照してください。
