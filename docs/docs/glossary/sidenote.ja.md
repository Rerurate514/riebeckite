---
title: Sidenote
sidebar:
  hidden: true
---

# Sidenote
既定ではGFMの脚注を記事末尾に表示し、`placement: "margin"`を指定すると参照の横にTufte風のマージンノートを表示する脚注スタイルです。

## 脚注の記法
通常のGFMの脚注を書きます。

```md
Riebeckite は脚注を記事末尾に表示します。[^1]

[^1]: 記事の最後に注記が表示されます。
```

## Sidenoteの描画
- 既定（`placement: "end"`）では、各参照の`sup`に`rr-sidenotes__ref`、リンクに`rr-sidenotes__toggle`が付きます。文末の`<section data-footnotes>`には`.rr-sidenotes__footnotes`が付き、画面幅にかかわらず表示されます。元の`href`、`id`、バックリンクは保持されます。
- `placement: "margin"`では、各定義が最も近いブロックの後ろの`.rr-sidenotes__note`のasideになります。
  - 既定では本文フロー内のインラインノート
  - 記事のレールを置ける幅（`@media (min-width: 88rem)`）ではスティッキーなマージンノート
  - 文末の脚注定義セクションは非表示
- クライアントエントリはありません。参照もバックリンクも通常のアンカーで移動します。

## 設定

```ts
import { sidenotes } from "@riebeckite/plugin-sidenotes";

sidenotes(); // 脚注を記事末尾に表示
sidenotes({ placement: "margin" }); // Tufte風のマージンノート
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
