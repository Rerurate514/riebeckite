# @riebeckite/ai

Riebeckite の AI 連携設定を扱うパッケージです。生成するガイダンス、Skills、クライアントの MCP 設定、変更ポリシーを提供します。

[English](./README.md)

`getAiSetupFiles` は `RIEBECKITE_AI.md`、`AGENTS.md`、`CLAUDE.md`、`.github/copilot-instructions.md`、生成 Skills を組み立てます。`aiRuleFiles` はガイダンス、`aiSkillFiles` は Skills を生成し、どちらも Riebeckite のバージョンを受け取って生成ファイルに記録します。

`mergeAiClientConfig` は Claude、Cursor、VS Code、OpenCode のプロジェクト内設定に `riebeckite` MCP サーバーを追加し、ほかのキーとサーバーを保持します。`createMutationPathPolicy` と `validateAiIntegration` は任意の `integrations.ai` 変更境界を定義・検証します。
