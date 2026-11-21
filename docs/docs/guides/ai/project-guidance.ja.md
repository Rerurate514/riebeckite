---
date: 2026-11-22
title: AI 向けのプロジェクト設定
sidebar.label: プロジェクト設定
---
# AI 向けのプロジェクト設定

`RIEBECKITE_AI.md` は、コンテンツの場所、frontmatter、リンク、確認コマンドなど、
そのプロジェクト固有の前提を AI に伝えます。必要に応じて編集してください。

生成 Skills は、サイト、Plugin、Theme、設定、トラブルシューティング、アップグレードを
扱います。各 Skill は `SKILL.md`、`references/guide.md`、
`assets/checklist.md` で構成され、編集できます。

```sh
npm exec riebeckite skills sync
```

Skill の対応バージョンが CLI と異なるとき、このコマンドは現在の内容と置換後の内容を
表示します。Skill ごとの確認、まとめて置換、更新しない、のいずれかを選べます。
