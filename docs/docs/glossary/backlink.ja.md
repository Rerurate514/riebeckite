---
title: Backlink
sidebar:
  hidden: true
---

# Backlink

現在のノートへのリンクを示すバックリンクリストのレンダリングで、`getPublishedBacklinks()` でコンテンツマニフェストからインカミングリンクを解決し、公開可能なノートのみをフィルタリングしてマニフェスト順にソートします。

## 推奨される配置

 `backlinksPlugin()` は自動的に `article.footer` セマンティックボディスロットの incoming links リストを append します。

Site が物理的な配置を所有します: スロットがレンダリングされる場所だけで、 normally は記事コンテンツの後に一度表示されます。

 incoming links (あるいは公開されているものが何もない場合) は、コンポーネントが何もレンダリングしません。

## 高度なカスタマイズ

 different location を選択するには、`render: false` で自動スロットへの貢献を防止します; これはバックリンクデータやその公開フィルタリングを変更しません。

 マニュアルでデータを解決します:

```tsx
import Backlinks, { getPublishedBacklinks } from "@riebeckite/plugin-backlinks";
import { content } from "virtual:riebeckite/content";
import { getArticleTitle } from "../lib/article-title";

const manifest = await content.getManifest();
const backlinks = getPublishedBacklinks({
  manifest,
  config,
  slug,
  resolveTitle: getArticleTitle,
});

return (
  <aside>
    <Backlinks backlinks={backlinks} />
  </aside>
);
```

## 設定

```ts
plugins: [backlinksPlugin({ render: false })];
```

手動で配置した UI を削除するにはコンポーネントを削除します。 `article.footer` と自動レンダリングが有効な状態で両方をレンダリング then、二重に表示されます。

## 関連用語

- [[glossary/obsidian-vault|Obsidian Vault]]
- [[tag|Tag]]
- [[shortcode|Shortcode]]
- [[callout|Callout]]
- [[sidenote|Sidenote]]
- [[glossary/site|Site]]
- [[glossary/ui|UI]]

## さらに詳しく

- [Backlinks](../plugins/backlinks.ja.md)
