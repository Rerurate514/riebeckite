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
リンク、コンテンツ一覧と本文、変更内容の検証を AI に渡します。`riebeckite_plugin_catalog` は
公開 npm レジストリから公開済みの `@riebeckite/plugin-*` パッケージを検索します。読み取り専用で、
ネットワーク接続が必要です。ローカルのサイト状態の唯一の基準は引き続き Riebeckite です。

手動接続が必要な場合だけ、開発サーバーと `@riebeckite/mcp` に同じ
`RIEBECKITE_BRIDGE_TOKEN` を渡します。トークンは32文字以上にしてください。

変更ツールはオプトインです。開発サーバーと MCP プロセスの両方に
`RIEBECKITE_BRIDGE_MUTATION_TOKEN` と `RIEBECKITE_BRIDGE_MUTATION_APPROVAL_TOKEN` を
設定します。それぞれ32文字以上で、異なる値にしてください。`riebeckite_mutation_plan` は
コンテンツを変更せずに Plan を保存します。`riebeckite_mutation_apply` は、人が承認トークンを
設定した対話端末で `npm exec riebeckite bridge approve <plan-id>` を実行した後だけ成功します。
承認は5分で失効し、1回だけ使えます。変更トークンがない場合、ツールはエラーを返します。
