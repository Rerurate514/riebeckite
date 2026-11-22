---
date: 2026-11-22
title: AI 連携
sidebar.label: AI 連携
---
# AI 連携

Riebeckite の AI 連携は、AI にサイトの状態を推測させず、開発中の診断・公開状態・リンク情報を渡すための仕組みです。AI が承認なしに変更を適用することはありません。

## この章

- [MCP を接続する](./mcp.ja.md) — 開発サーバーと AI クライアントを安全に接続します。
- [AI 向けのプロジェクト設定](./project-guidance.ja.md) — ルール、検証、Skills を追加・更新します。
- [AI ができることとできないこと](./boundaries.ja.md) — 読み取り、検証、変更承認の境界を確認します。
- [旧「AI 連携」ページ（移行用）](../ai-integration.ja.md)

プロジェクト作成時は、必要な機能だけを選べます。

```sh
npx create-riebeckite my-site --ai mcp,lint,rules,skills
```

`mcp` は MCP パッケージ、`lint` は `npm run content:lint`、`rules` は
`AGENTS.md`、`CLAUDE.md`、`.github/copilot-instructions.md`、`RIEBECKITE_AI.md`、
`skills` は `.agents/skills/` を追加します。`ai setup --client` を使わない限り、
AI クライアントの設定は変更しません。

既存プロジェクトでは、`npm exec riebeckite ai setup` で不足分を追加できます。
既存のガイダンスファイルは上書きしません。
