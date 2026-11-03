---
date: 2026-10-08
title: はじめに
sidebar:
  label: はじめに
  order: 10
---
# はじめに

この章は、初めて Riebeckite でサイトを公開する人向けの一本道です。順番に読み進めてください。高度な診断、プラグイン開発、リポジトリの分離は、必要になったときに参照するページとして分けています。

```text
クイックスタート
    ↓
インストール
    ↓
最初のコンテンツ
    ↓
プリセット
    ↓
デプロイ
```

## Riebeckite とは

Riebeckite は、Markdown や Obsidian 形式のノートを高速な静的サイトに変換します。`content/` に Markdown を書き、ローカルで表示を確認し、`dist/` にビルドして公開します。

Riebeckite がこの形を選んだ理由は [設計思想](../philosophy.ja.md) にあります。この章を進めるだけなら読む必要はありません。

Riebeckite を使うために、このリポジトリを clone する必要はありません。[`create-riebeckite`](https://www.npmjs.com/package/create-riebeckite) が、サイトに必要なファイル一式を生成します。

## この章で学ぶこと

| ページ | 内容 |
| --- | --- |
| [クイックスタート](./quick-start.ja.md) | 作成、起動、Markdown の編集、確認、ビルドを短い手順で試す |
| [インストール](./installation.ja.md) | 必要な環境と、生成されるファイルを確認する |
| [最初のコンテンツ](./first-content.ja.md) | 最初の公開ページを書く、またはサンプルを編集する |
| [プリセット](./presets.ja.md) | `starter`、`blog`、`docs`、`minimal` などのプリセットを比較する |
| [デプロイ](./deployment.ja.md) | 手元から公開し、必要なら GitHub Actions で自動化する |
| [Obsidian Vault を使う](./obsidian-vault.ja.md) | 既存の Obsidian Vault を接続し、選んだノートを公開する |
| [最初のプラグインを追加する](./first-plugin.ja.md) | プラグインを入れて `==ハイライト==` 構文が効くことを確認する |
| [最初のテーマを変える](./first-theme.ja.md) | テーマを変えてデザインが変わることを確認する |

## 最短でサイトを公開する

```bash
npx create-riebeckite
```

CLI は、プロジェクト名、プリセット、コンテンツの取得元、デプロイ設定、依存関係をインストールするかどうかの順に確認します。プロジェクトのフォルダ名は既定で `my-riebeckite-site` です。手元で試すだけなら、`starter`、`This project`、`Not now`、インストールの既定値 `Yes` のまま進めてください。

```bash
cd my-riebeckite-site
npm exec riebeckite check
npm exec riebeckite dev
```

インストールの質問で `No` を選んだ場合は、先にフォルダ内で `npm install` を実行してください。

ターミナルに表示されたローカル URL をブラウザで開きます。`content/` の Markdown を編集し、公開するページに `publish: true` を付けてから、最後にビルドします。

```bash
npm exec riebeckite build
```

ビルド結果をそのまま公開する場合は、Wrangler をインストールして `npm exec -- riebeckite publish run --execute` を実行します。ログインと `wrangler.jsonc` の生成は自動です。詳しくは [デプロイ](./deployment.ja.md) を参照してください。

プリセットで迷ったら、既定の `starter` を使ってください。記事、タグ、シリーズを持つメディアを作る場合は、プリセットの質問で `blog` を選ぶか、`npx create-riebeckite my-blog --preset blog` を実行します。

> **Riebeckite 本体を開発する場合**は [Framework / Development](../framework/development.ja.md) へ進んでください。

## サイトをカスタマイズする

| やりたいこと | ガイド |
| --- | --- |
| すでに Obsidian を使っている | [Obsidian Vault を使う](./obsidian-vault.ja.md) |
| 機能を追加したい（検索、図表、埋め込み…​） | [最初のプラグインを追加する](./first-plugin.ja.md) |
| 見た目を変えたい（色、フォント、レイアウト…​） | [最初のテーマを変える](./first-theme.ja.md) |
| アイコン、ロゴ、リンクプレビュー画像を差し替えたい | [サイトのアイコンとロゴ](../guides/branding.ja.md) |

## 次に読むページ

- [クイックスタート →](./quick-start.ja.md)
