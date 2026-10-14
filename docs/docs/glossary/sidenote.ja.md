---
title: Sidenote
sidebar:
  hidden: true
---

# Sidenote
脚注の記法を、インラインの参照と、デスクトップではマージンノート、モバイルではポップオーバーに置き換えるTufte風のサイドノートです。モバイルのポップオーバーの切り替えには、小さなclient entry（`initSidenotes`）を使います。

## 脚注の記法
通常のGFMの脚注を書きます。

```md
Riebeckite renders margin notes at the side of the text.[^1]

[^1]: The note text appears beside the reference on desktop and in a popover on mobile.
```

## Sidenoteの描画
- 各脚注の参照は、`href="#fn-…"`を保つ小さな参照リンク（`[data-rr-sidenotes-ref]`）を持つ`sup`になります。
- 各脚注の定義は、参照の隣の`.rr-sidenotes__note`のasideになります。
- タブレット幅（`@media (min-width: 48rem)`）ではインラインノート
- 記事のレールを置ける幅（`@media (min-width: 88rem)`）ではスティッキーなマージンノート
- モバイル（`@media (max-width: 48rem)`）ではポップオーバー

## クライアントの初期化
小さなclient entry（`initSidenotes`）がモバイルのポップオーバーを切り替えます。タップで開閉し、`Escape`で閉じ、外側のクリックでも閉じます。

$(min-width: 48rem)`に一致するページでは処理しません。デスクトップのマージンノートにJavaScriptは不要です。

```ts
import { initSidenotes } from "@riebeckite/plugin-sidenotes";
```

### クライアントオプション
`initSidenotes`は次のオプションを受け入れます。

- **selector**: リファレンスリンクのCSSセレクター。既定値は`[data-rr-sidenotes-ref]`。
- **openLabel**: ポップオーバーが閉じているときのアクセシブルラベルのプレフィックス。既定値は`"Footnote"`。
- **closeLabel**: ポップオーバーが開いているときのアクセシブルラベルのプレフィックス。既定値は`"Close sidenote"`。

```ts
import { initSidenotes } from "@riebeckite/plugin-sidenotes";
initSidenotes({
  selector: ".custom-ref",
  openLabel: "脚注",
  closeLabel: "閉じる",
});
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