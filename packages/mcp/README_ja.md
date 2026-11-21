# @riebeckite/mcp

ローカルの Riebeckite development Bridge 用 MCP サーバーです。ビルド状態、
コンテンツ、診断、変更検証の正本は引き続き Riebeckite です。

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

読み取り用 Bridge ツールと変更検証だけを公開します。変更プランの作成・適用は
公開せず、Riebeckite の明示的な変更機能と人間による承認が必要です。
