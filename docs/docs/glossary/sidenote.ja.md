---
date: 2026-10-14
title: サイドノート（Sidenote）
sidebar:
  hidden: true
---

# サイドノート（Sidenote）

既定ではGFMの脚注定義を記事末尾に保つ脚注スタイルです。`placement: "margin"` を指定すると、定義は参照の横にTufte風のマージンノートとして表示されます。

## 脚注の記法

通常のGFMの脚注を書きます。

```md
Riebeckite keeps notes at the end of the article.[^1]

[^1]: The note text appears in the footnote list.
```

## サイドノートの描画

- 既定（`placement: "end"`）：各参照の `sup` に `rr-sidenotes__ref`、リンクに `rr-sidenotes__toggle` が付きます。文末の `<section data-footnotes>` には `.rr-sidenotes__footnotes` が付き、画面幅にかかわらず表示されます。元の `href`、`id`、バックリンクは保持されます。
- `placement: "margin"`：各定義が、最も近いブロックの後ろの `.rr-sidenotes__note` のasideになります。
  - 既定では本文フロー内のインラインノート
  - 記事のレールを置ける幅（`@media (min-width: 88rem)`）ではスティッキーなマージンノート
  - 文末の脚注定義セクションは非表示
- クライアントエントリはありません。参照もバックリンクも通常のアンカーで移動します。

## 設定

```ts
import { sidenotes } from "@riebeckite/plugin-sidenotes";

sidenotes(); // definitions at the end of the article
sidenotes({ placement: "margin" }); // Tufte-style margin notes
```

## 関連用語

- [[glossary/obsidian-vault|Obsidian Vault]]
- [[tag|Tag]]
- [[shortcode|Shortcode]]
- [[callout|Callout]]
- [[backlink|Backlink]]
- [[glossary/site|Site]]
- [[glossary/ui|UI]]

## さらに詳しく

- [Sidenotes](../plugins/sidenotes.ja.md)
