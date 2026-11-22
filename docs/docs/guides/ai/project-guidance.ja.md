---
date: 2026-11-22
title: AI 向けのプロジェクト設定
sidebar.label: プロジェクト設定
---
# AI 向けのプロジェクト設定

`AGENTS.md` は AI クライアントが最初に読む入口です。`RIEBECKITE_AI.md` を参照し、
コンテンツの場所、frontmatter、リンク、確認コマンドなど、そのプロジェクト固有の前提を
伝えます。セットアップは `CLAUDE.md` と `.github/copilot-instructions.md` も生成し、
同じガイダンスを参照させます。必要に応じてこれらを編集してください。

生成 Skills は、サイトコンテンツ、Plugin の選定と作成、アプリケーションコンポーネント、
コンテンツ移行、デプロイ、Theme、設定、トラブルシューティング、アップグレードを扱います。
各 Skill は `SKILL.md`、`references/guide.md`、
`assets/checklist.md` で構成され、`.agents/skills/` に書き込まれます。

既存プロジェクトに AI 設定を追加するには、次を実行します。

```sh
npm exec riebeckite ai setup
```

`@riebeckite/ai`、`@riebeckite/mcp`、`content:lint` スクリプト、`AGENTS.md`、
`RIEBECKITE_AI.md`、`CLAUDE.md`、`.github/copilot-instructions.md`、
すべての生成 Skill を追加します。既存のガイダンスファイルは変更しません。
`RIEBECKITE_AI.md` が別の Riebeckite バージョンで生成されている場合は警告を表示します。
古い生成 Skill は確認後に置き換えます。

```sh
npm exec riebeckite skills sync
```

`skills sync` は不足している Skill と Skill 内のファイルを追加します。
Skill の対応バージョンが CLI と異なるときは、現在の内容と置換後の内容を表示します。
Skill ごとの確認、まとめて更新、更新しない、のいずれかを選べます。

`.agents/skills/` は OpenCode が検出する場所です。クライアントが別の場所から Skills を
読む場合は、リンクを追加するかクライアント側でパスを設定してください。
`skills sync` が更新するのは `.agents/skills/` だけです。

`riebeckite doctor` は、AI ガイダンスの不足、ガイダンスまたは Skills の
Riebeckite バージョン不一致、`@riebeckite/mcp` の不足を警告します。
