---
date: 2026-11-08
title: 実例
sidebar.label: 実例
sidebar.order: 40
---
# 実例

生成された starter サイトを起点にした、よくある改造の before/after 例です。ファイル全体の対応表は [レイアウト](./layout.ja.md) を見てください。

## ヘッダーにリンクを追加する（設定のみ）

Before — 既定のナビゲーションは Vault からリンクを自動で作ります:

```ts
plugins: [navigation()],
```

After — `riebeckite.config.ts` で `items` を明示します:

```ts
plugins: [
  navigation({
    items: [{ label: "About", href: "/about" }],
  }),
],
```

詳しくは [ページとナビゲーション](./pages-and-navigation.ja.md) を参照してください。

## 記事の横にプラグインのUIを置く

Before — 記事ページは生成された `app/components/article.tsx` だけを使います。

After — aside 用の自作コンポーネントでプラグインコンポーネントを描画し、`article.tsx` から使います:

```tsx
// app/components/article-aside.tsx
import { Backlinks } from "@riebeckite/plugin-backlinks";
import { TableOfContents } from "@riebeckite/plugin-toc";

export function ArticleAside({ items, backlinks }: Props) {
  return (
    <aside>
      <TableOfContents items={items} />
      <Backlinks backlinks={backlinks} />
    </aside>
  );
}
```

詳しくは [プラグインとCSS](./plugins-and-css.ja.md) を参照してください。

## カスタムページを追加する

After — `app/routes/about.tsx` を作ると、HonoX のファイルベースルーティングで `/about` に配信されます:

```tsx
export default function About() {
  return (
    <main>
      <h1>About</h1>
      <p>自分で作ったページです。</p>
    </main>
  );
}
```
