---
date: 2026-11-22
title: AI 連携
sidebar.label: AI 連携
---
# AI 連携

> このページは移行用です。新しい構成は [AI 連携](./ai/README.ja.md) を参照してください。

## 以前の構成

AI クライアントには、stdio MCP のコマンドとして
`npm exec riebeckite ai mcp` を登録します。このコマンドはローカル開発
サーバーと MCP サーバーをまとめて起動し、一時的な Bridge トークンを生成します。
トークンをクライアント設定に書く必要はありません。開発中はクライアント側の
コマンドを起動したままにします。

Riebeckite の AI 連携は、サイトの状態を推測させず、既存の検証と公開状態を AI ツールへ渡すための仕組みです。AI がファイルを直接変更したり、承認済みの変更を自動適用したりするものではありません。

## プロジェクト作成時に追加する

`create-riebeckite` の対話セットアップでは、AI サポートを有効にした後、必要な項目だけを選べます。非対話では次のように指定します。

```sh
npx create-riebeckite my-site --ai mcp,lint,rules,skills
```

- `mcp` は `@riebeckite/mcp` を開発依存へ追加します。
- `lint` は `npm run content:lint` として `riebeckite check` を追加します。
- `rules` は `AGENTS.md` とプロジェクト固有の `RIEBECKITE_AI.md` を生成します。
- `skills` は OpenCode 互換の `.agents/skills/` を生成します。

AI クライアントの設定は自動では行いません。

既存プロジェクトでは、`npm exec riebeckite ai setup` で不足している MCP 依存、lint
スクリプト、ガイダンス、Skills を追加できます。既存のガイダンスファイルは上書きしません。

## MCP を接続する

MCP は開発時限定の Bridge を stdio で接続する薄いアダプターです。AI は、現在のプレビュー、公開状態、診断、リンク、コンテンツ一覧を Bridge から取得できます。`riebeckite_plugin_catalog` は、サイトを変更せずに公開 npm レジストリから公式 Plugin パッケージを検索します。ローカルのサイト状態の唯一の基準は Riebeckite です。

開発サーバーと MCP に同じ32文字以上のトークンを渡します。

```sh
RIEBECKITE_BRIDGE_TOKEN=<token> npm run dev
```

MCP クライアントには次を設定します。

```json
{
  "command": "npx",
  "args": ["-y", "@riebeckite/mcp"],
  "env": {
    "RIEBECKITE_BRIDGE_DEVELOPMENT_ORIGIN": "http://127.0.0.1:5173",
    "RIEBECKITE_BRIDGE_TOKEN": "<同じtoken>"
  }
}
```

MCP は読み取りと変更内容の検証を提供します。変更トークンを設定した場合は、変更 Plan の
作成と、人が `npm exec riebeckite bridge approve <plan-id>` で承認した後の適用も行えます。
承認は引き続き人が CLI で行います。

## 生成される Skills

Skills はサイトコンテンツ、Plugin の選定と作成、アプリケーションコンポーネント、コンテンツ移行、デプロイ、Theme、設定、トラブルシューティング、アップグレードを扱います。各 Skill には `SKILL.md`、`references/guide.md`、`assets/checklist.md` があり、編集できます。MCP が利用できる場合は先にその情報を使い、使えない場合は CLI の検証へ戻ります。

`SKILL.md` の `riebeckiteVersion` が CLI と異なる場合は、対話端末で次を実行します。

```sh
npm exec riebeckite skills sync
```

現在の内容と置換後の内容を確認し、Skill ごとに更新するか、対応する生成済み Skill をまとめて置換するか、更新しないかを選びます。確認なしに更新されることはありません。まとめて置換する前には、独自の変更を確認または退避してください。
