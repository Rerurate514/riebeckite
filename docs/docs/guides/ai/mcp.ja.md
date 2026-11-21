---
date: 2026-11-22
title: MCP を接続する
sidebar.label: MCP
---
# MCP を接続する

AI クライアントには、stdio MCP のコマンドとして次を登録します。

```sh
npm exec riebeckite ai mcp
```

このコマンドはローカル開発サーバーと MCP サーバーを起動し、その実行中だけ有効な
Bridge トークンを生成します。トークンを AI クライアントの設定へ書く必要はありません。

MCP は開発時限定の Bridge に接続する薄いアダプターです。プレビュー、公開状態、診断、
リンク、コンテンツ一覧と本文、変更内容の検証を AI に渡します。Riebeckite が状態の唯一の基準です。

手動接続が必要な場合だけ、開発サーバーと `@riebeckite/mcp` に同じ
`RIEBECKITE_BRIDGE_TOKEN` を渡します。トークンは32文字以上にしてください。
