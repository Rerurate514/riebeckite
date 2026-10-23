---
date: 2026-10-14
title: Obsidian Vault
sidebar:
  hidden: true
---

# Obsidian Vault

Riebeckiteは既存のObsidian Vaultをコンテンツディレクトリとして読めるため、Vaultを整理し直さずに、選んだノートだけを公開できます。

## Vaultの接続

`riebeckite.config.ts` を開き、`content.directory` をVaultのパスに設定します。

```ts
content: {
  directory: "../my-vault",
}
```

`../my-vault` は、サイトからVaultまでの相対パスに置き換えます。

`starter` プリセットには、WikiLink、埋め込み、コールアウト、タグに対応するObsidian Markdownプラグインがすでに含まれています。

## 明示的な公開

公開するノートのfrontmatterに `publish: true` を追加します。

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

`publish: true` のないノートは下書きとして扱われ、ビルドされません。

`riebeckite check` と `riebeckite doctor` を実行して、リンクとコンテンツの状態を検証します。

## WikiLinkと埋め込み

WikiLinkに対応しています。`[[note]]`、`[[note|label]]`、`[[note#Heading]]` を使えます。

画像の埋め込みも使えます。`![[sample.png]]` と書きます。

コールアウトにも対応しています。`> [!NOTE]` と書きます。

タグにも対応しており、タグページは `starter` のタクソノミープラグインが提供します。

## Obsidian Markdownプラグイン
`starter` プリセットには `@riebeckite/plugin-obsidian-markdown` プラグインが含まれており、次の機能を提供します。
- WikiLinkの解決（`[[note]]`、`[[note|label]]`、`[[note#Heading]]`）
- 画像の埋め込み（`![[sample.png]]`）
- コールアウトのパース（`> [!WARNING]` など）
- タグ `#hashtag` からタクソノミーのタグリンクへの変換

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
