---
title: Sidenote
sidebar:
  hidden: true
---

# Sidenote

Tufte スタイルのサイドノートで、footnote マークダウンをインライン参照とマージンノート（デスクトップ）またはポップオーバー（モバイル）に書き換えます。モバイルポップオーバーの動作を切り替える小さなクライアントエントリ (`initSidenotes`) を使用します。

## footnote 構文

通常の GFM footnotes を書きます:

```md
Riebeckite は側面にマージンノートを描画します.[^1]

[^1]: リファレンスの横にノートテキストが表示され、モバイルではポップオーバーになります。
```


## サイドノートの描画

- 各 footnote リファレンス は `sup` で小さな参照リンク (`[data-rr-sidenotes-ref]`) になり、`href="#fn-…"` ターゲットを保持します。

- 各 footnote 定義は参照の横に `.rr-sidenotes__note` aside として表示されます:
  - タブレット幅以上 (`@media (min-width: 48rem)`) でインラインノート
  - article rail があればスティッキーマージンノート (`@media (min-width: 88rem)`)
  - モバイル (`@media (max-width: 48rem)`) でポップオーバー


## クライアント初期化

モバイルポップオーバーを切り替える小さなクライアントエントリ (`initSidenotes`) を使用します: tap で開閉、 `Escape` で閉じる、外クリックで閉じる。

 `(min-width: 48rem)` に一致するページは無視されます — デスクトップのマージンノートは JavaScript を必要としません。

```ts
import { initSidenotes } from "@riebeckite/plugin-sidenotes";
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
