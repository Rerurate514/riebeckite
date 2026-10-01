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
| [Deployment](./deployment.md) | まず手元から公開し、その後 GitHub Actions で自動化する |

## 最短手順

```bash
npx create-riebeckite my-site
cd my-site
npm install
npm exec riebeckite dev
```

ターミナルに表示されたローカル URL をブラウザで開きます。`content/` の Markdown を編集し、公開したいページに `publish: true` を付けたら、最後にビルドします。

```bash
npm exec riebeckite build
```

preset で迷ったら、既定の `starter` を使ってください。

> **Riebeckite 本体を開発する場合** は [Framework / Development](../framework/development.md) へ進んでください。

## 次に読むページ

- [Quick Start →](./quick-start.md)
