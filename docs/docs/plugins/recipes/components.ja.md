---
date: 2026-10-20
title: "Site コンポーネントを配布する"
sidebar:
  label: "7. Site コンポーネントを配布する"
  order: 7
---
# Site コンポーネントを配布する

プラグインから Hono JSX コンポーネントを `PluginSiteComponent` として export して、サイトに配置を任せられます。また、`markdownComponents` を通じて Markdown コンポーネントを登録できます。サイトがレイアウトを所有して置き場所を決める場合は export を使い、コンテンツ作者が Markdown から配置する場合は登録したコンポーネントを使います。このレシピでは手動配置の export を扱います。

プラグインのパッケージにコンポーネントを作ります。

```tsx
import type { PluginSiteComponent } from "@riebeckite/core";

export type SeriesListProps = {
  series: readonly {
    title: string;
    permalink: string;
  }[];
};

const SeriesList = (({ series }: Readonly<SeriesListProps>) => {
  if (series.length === 0) return null;

  return (
    <nav class="rr-series" aria-label="Series">
      <ol class="rr-series__list">
        {series.map((item) => (
          <li class="rr-series__item" key={item.permalink}>
            <a class="rr-series__link" href={item.permalink}>
              {item.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}) satisfies PluginSiteComponent<SeriesListProps>;

export default SeriesList;
```

パッケージのルートから再 export します。

```ts
export { default as SeriesList } from "./components/series-list.js";
export type { SeriesListProps } from "./components/series-list.js";
```

サイト側では、他のコンポーネントと同じように配置します。

```tsx
import { SeriesList } from "@example/riebeckite-plugin-series-list";

return (
  <SeriesList
    series={[
      { title: "Part 1", permalink: "/series/typescript/part-1" },
      { title: "Part 2", permalink: "/series/typescript/part-2" },
    ]}
  />
);
```

表示するものがないときは `null` を返すため、サイトは条件分岐なしで描画できます。マニフェストのデータが必要な場合は、公開範囲で絞り込んだビューだけを受け取るヘルパーを export してください。ブラウザ側で下書きを読まないようにします。

コンテンツ作者が Markdown から UI を配置する場合は、プラグインの `markdownComponents` で宣言し、対話型ならクライアントモジュールを指定します。[Markdown コンポーネント](../../reference/plugin-api/ui-and-assets.ja.md#markdown-コンポーネント) を参照してください。

---

[プラグイン機能別レシピに戻る](./README.ja.md) · [Plugin API](../../reference/plugin-api.ja.md)
