---
title: Obsidian Vault
sidebar:
  hidden: true
---

# Obsidian Vault

既存のObsidian vaultをコンテンツディレクトリとして読み込めるため、vaultを整理し直さずに、選んだノートだけを公開できます。

## Vaultの接続

`riebeckite.config.ts`を開き、`content.directory`をvaultのパスに設定します。

```ts
content: {
  directory: "../my-vault",
}
```

`../my-vault`は、サイトからvaultまでの相対パスに置き換えます。

`starter`プリセットには、WikiLink、埋め込み、Callout、タグに対するObsidian Markdown Pluginが既に含まれています。

## 明示的な公開

公開するノートのfrontmatterに`publish: true`を追加します。

```md
---
title: Hello
publish: true
tags:
  - example
aliases:
  - Hello note
---
```

`publish: true`のないノートは下書きとして扱われ、Buildされません。

`riebeckite check`と`riebeckite doctor`を実行し、リンクとコンテンツの状態を検証します。

## WikiLinkと埋め込み

WikiLinkに対応しています。`[[note]]`、`[[note|label]]`、`[[note#Heading]]`を使えます。

画像の埋め込みも使えます。`![[sample.png]]`と書きます。

Calloutにも対応しています。`> [!NOTE]`と書きます。

タグにも対応しており、タグページは`starter`のTaxonomy Pluginが提供します。

## Obsidian Markdown（プラグイン）が扱うもの
`starter`プリセットには`@riebeckite/plugin-obsidian-markdown`プラグインが含まれており、次の機能を提供します。
- WikiLinkの解決(`[[note]]`、`[[note|label]]`、`[[note#Heading]]`)
- 画像の埋め込み(`![[sample.png]]`)
- コールアウトのパーサー (`> [!WARNING]`など)
- タグ`#hashtag`をタグマップのリンクに変換

## 関連用語

- [[tag|Tag]]
- [[shortcode|Shortcode]]
- [[callout|Callout]]
- [[sidenote|Sidenote]]
- [[backlink|Backlink]]
- [[glossary/site|Site]]
- [[glossary/ui|UI]]

## さらに詳しく

- [Obsidian Vault](../getting-started/obsidian-vault.ja.md)
