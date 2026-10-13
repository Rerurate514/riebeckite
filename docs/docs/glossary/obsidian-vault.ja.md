---
title: Obsidian Vault
sidebar:
  hidden: true
---

# Obsidian Vault

Riebeckite は既存の Obsidian ヴォールト をコンテンツディレクトリとして読み込み、選択したノートだけを公開できます。

## ヴォールトの接続

 `riebeckite.config.ts` で `content.directory` をヴォールトのパスに指定します:

```ts
content: {
  directory: "../my-vault",
}
```

site から見たヴォールトまでの相対パスに変更してください。

 `starter` プリセット にはすでに WikiLinks、埋め込み、コールアウト、タグ に対応する Obsidian Markdown プラグイン が含まれています。


## 明示的な公開

公開したいノートの frontmatter に `publish: true` を追加します:

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

 `publish: true` がないノートは下書きとして扱われ、ビルドされません。

 `riebeckite check` と `riebeckite doctor` でリンクとコンテンツ状態を検証します。


## WikiLinks と埋め込み

WikiLinks がサポートされています: `[[note]]`, `[[note|label]]`, `[[note#Heading]]`.

画像の埋め込みもサポートされています: `![[sample.png]]`.

コールアウト もサポートされています: `> [!NOTE]`.

タグ もサポートされており、タグページはスターターテクストロジー プラグインによって提供されます。


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
