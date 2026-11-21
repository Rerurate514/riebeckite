---
date: 2026-11-22
title: AI 向けのプロジェクト設定
sidebar.label: プロジェクト設定
---
# AI 向けのプロジェクト設定

`AGENTS.md` は AI クライアントが最初に読む入口です。`RIEBECKITE_AI.md` を参照し、
コンテンツの場所、frontmatter、リンク、確認コマンドなど、そのプロジェクト固有の前提を
伝えます。必要に応じて両方を編集してください。

生成 Skills は、サイトコンテンツ、Plugin の選定と作成、アプリケーションコンポーネント、
コンテンツ移行、デプロイ、Theme、設定、トラブルシューティング、アップグレードを扱います。
各 Skill は `SKILL.md`、`references/guide.md`、
`assets/checklist.md` で構成され、編集できます。

既存プロジェクトに AI 設定を追加するには、次を実行します。

```sh
npm exec riebeckite ai setup
```

`@riebeckite/mcp`、`content:lint` スクリプト、`AGENTS.md`、`RIEBECKITE_AI.md`、
すべての生成 Skill を追加します。既存のガイダンスファイルは変更せず、古い生成 Skill は
確認後に置き換えます。

```sh
npm exec riebeckite skills sync
```

`skills sync` は不足している Skill と Skill 内のファイルを追加します。
Skill の対応バージョンが CLI と異なるときは、現在の内容と置換後の内容を表示します。
Skill ごとの確認、まとめて更新、更新しない、のいずれかを選べます。
