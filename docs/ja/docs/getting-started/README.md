---
title: Getting Started
sidebar:
  label: Getting Started
  order: 10
---
# Getting Started

この章は、初めて Riebeckite でサイトを公開する人のための一本道です。高度な診断、Plugin 開発、リポジトリ分離は、必要になったときに読むページへ分けています。

```text
Quick Start
    ↓
Installation
    ↓
First Content
    ↓
Presets
    ↓
Deployment
```

## Riebeckite とは

Riebeckite は、Markdown や Obsidian 形式のノートを高速な静的サイトにするためのツールです。`content/` に Markdown を置き、ローカルで確認し、`dist/` にビルドして公開します。

Riebeckite を使うために、このリポジトリを clone する必要はありません。[`create-riebeckite`](https://www.npmjs.com/package/create-riebeckite) が、サイト用のファイル一式を生成します。

## この章のページ

| ページ | できること |
| --- | --- |
| [Quick Start](./quick-start.md) | 作成、起動、Markdown 編集、確認、ビルドを短い手順で試す |
| [Installation](./installation.md) | 必要な環境と生成されるファイルを確認する |
| [First Content](./first-content.md) | 最初の公開ページを書く、またはサンプルを編集する |
| [Presets](./presets.md) | `starter`、`minimal`、`showcase`、`empty` を比較する |
| [Deployment](./deployment.md) | 手元から公開し、必要なら GitHub Actions で自動化する |
| [Obsidian Vault を使う](./obsidian-vault.md) | 既存の Obsidian Vault を接続し、選んだノートを公開する |
| [最初の Plugin を追加する](./first-plugin.md) | Plugin を入れて `==ハイライト==` 構文が効くことを確認する |
| [最初の Theme を変える](./first-theme.md) | Theme を変えてデザインが変わることを確認する |

## 最短手順

```bash
npx create-riebeckite
```

CLI が、プロジェクト名・preset・コンテンツの取得元・デプロイ設定を順に確認します。手元で試すだけなら `starter`、`This project`、`Not now` のまま進めてください。

```bash
cd my-site
npm install
npm exec riebeckite dev
```

ターミナルに表示されたローカル URL をブラウザで開きます。`content/` の Markdown を編集し、公開したいページに `publish: true` を付けたら、最後にビルドします。

```bash
npm exec riebeckite build
```

ビルド結果をそのまま公開する場合は、Wrangler を入れて `npm exec riebeckite deploy` を実行します。ログインと `wrangler.jsonc` の生成は自動です。詳しくは [Deployment](./deployment.md) を参照してください。

preset で迷ったら、既定の `starter` を使ってください。

> **Riebeckite 本体を開発する場合** は [Framework / Development](../framework/development.md) へ進んでください。

## Riebeckite をカスタマイズする

| やりたいこと | ガイド |
| --- | --- |
| すでに Obsidian を使っている | [Obsidian Vault を使う](./obsidian-vault.md) |
| 機能を追加したい (検索、図表、埋め込み…​) | [最初の Plugin を追加する](./first-plugin.md) |
| 見た目を変えたい (色、フォント、レイアウト…​) | [最初の Theme を変える](./first-theme.md) |

## 次に読むページ

- [Quick Start →](./quick-start.md)
