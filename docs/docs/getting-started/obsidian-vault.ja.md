---
date: 2026-10-08
title: Obsidian Vault を使う
sidebar.order: 50
---
# Obsidian Vault を使う

すでに [[glossary/obsidian-vault|Obsidian Vault]] がある場合は、Riebeckite からその Vault をサイトのコンテンツとして読むことができます。まずローカルで 1 つのノートを公開し、リンクと画像を確認してから、`dist/` をビルドします。

Vault の公開範囲や日々の運用まで踏み込む場合は、[Obsidian のノートをサイトにする](../guides/obsidian.ja.md) を参照してください。

## 始める前に

必要なものは次の3つです。

- Node.js
- 既存の Obsidian Vault
- 公開してよいノート 1 つ

Riebeckite は Obsidian のワークスペース設定を必要としません。`.obsidian/` は自動的に無視されるため、Vault から削除する必要はありません。

## 1. Riebeckite サイトを作る

Vault の隣にサイトを作ります。

```sh
npx create-riebeckite my-site --preset starter
cd my-site
```

`starter` [[glossary/preset|プリセット]]には、[[glossary/wikilink|WikiLink]]、埋め込み、Callout、タグを扱う Obsidian Markdown [[glossary/plugin|プラグイン]]が最初から入っています。

## 2. Vault を接続する

`riebeckite.config.ts` を開き、`content.directory` を Vault に向けます。

```ts
content: {
  directory: "../my-vault",
},
```

`../my-vault` は、`my-site` から見た Vault への相対パスに置き換えてください。

## 3. 公開するノートを選ぶ

Riebeckite は、既定では明示的に指定したノートだけを公開します。

公開したいノートに、次の[[glossary/frontmatter|フロントマター]]を追加します。

```yaml
---
title: Hello
publish: true
tags:
  - example
aliases:
  - Hello note
---
```

意味は次のとおりです。

- `publish: true` のノートは公開ページとして生成されます。
- `publish: false` のノートはビルド結果に含まれません。
- `publish` がないノートは既定の `content.filters.publishStrategy: explicit` に従い、`starter` 構成では[[glossary/draft|下書き]]として扱われます（[公開ルール](../guides/deployment/separate-content-repository/publishing.ja.md)参照）。

公開ノートから未公開のノートへリンクすると、リンク先のページは生成されず、そのリンクも公開サイトで有効なリンクとしては公開されません（壊れたリンクと同じ表示になります）。

## 4. Riebeckite を起動する

依存関係をインストールし、`check` を実行します。

```sh
npm install
npm exec riebeckite check
```

続いて、ローカルプレビューを起動します。

```sh
npm exec riebeckite dev
```

ターミナルに表示されたローカル URL を開いてください。

開発サーバーを起動したまま Obsidian でノートを保存すると、次にページを表示したときに内容が反映されます。公開設定の変更も同じように反映されます。

---

詳しい手順、WikiLink・画像の確認、トラブルシューティングは [Obsidian のノートをサイトにする](../guides/obsidian.ja.md) を参照してください。

## 次のステップ

- 必要なノートだけに `publish: true` を付ける
- 設定を変更したら `npm exec riebeckite check` を実行する
- 公開前に `npm exec riebeckite build` を実行する
