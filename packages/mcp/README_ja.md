# @riebeckite/mcp

ローカルの Riebeckite development Bridge 用 MCP サーバーです。ビルド状態、
コンテンツ、診断、変更検証の正本は引き続き Riebeckite です。
`riebeckite_plugin_catalog` は、サイトを変更せずに公開 npm レジストリから
公式 Plugin パッケージを検索します。

[English](./README.md)

## 設定

`RIEBECKITE_BRIDGE_TOKEN` を設定して `riebeckite dev` を起動し、MCP クライアントに
次を設定します。

```json
{
  "command": "npx",
  "args": ["-y", "@riebeckite/mcp"],
  "env": {
    "RIEBECKITE_BRIDGE_DEVELOPMENT_ORIGIN": "http://127.0.0.1:5173",
    "RIEBECKITE_BRIDGE_TOKEN": "32文字以上のトークン"
  }
}
```

読み取り用 Bridge ツール、npm レジストリの Plugin 検索、変更検証を公開します。
`RIEBECKITE_BRIDGE_MUTATION_TOKEN`（32文字以上）を設定すると、変更プランの作成と
適用も利用できます。別の `RIEBECKITE_BRIDGE_MUTATION_APPROVAL_TOKEN` は開発サーバーと
MCP プロセスの両方に設定してください。プラン作成だけではコンテンツを変更しません。
適用には、人が `riebeckite bridge approve <plan-id>` を実行する必要があります。
CLI が `riebeckite ai mcp --mutations` で起動した場合は、両方のトークンを生成し、
承認トークンを `bridge approve` 用に `.riebeckite/` へ保存します。
