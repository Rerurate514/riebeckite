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

対応する Capability は `GET /__riebeckite/bridge/v1` で確認します。エディタツールは `/source?path=notes/example.md` でソースを解決し、そのソースの Preview、公開状態、Diagnostics、最後のビルドの影響範囲を取得できます。`/events` を購読すると、コンテンツ変更後に再取得できます。

Bridge は意図的に読み取り専用です。絶対ソースパスは返さず、routable でないコンテンツの非公開 Preview も提供せず、本番 URL を推測しません。コンテンツの編集や一括変更は、サーバー側の認可・承認モデルが整うまで、ローカルの CLI またはアプリケーション操作として扱います。

リクエストと応答の仕様は [Bridge Protocol v1](https://github.com/Rerurate514/riebeckite/blob/main/packages/dev-inspector/BRIDGE_ja.md) を参照してください。
