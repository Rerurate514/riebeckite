---
date: 2026-10-20
title: "UI コンポーネントを配布する"
sidebar:
  label: "7. UI コンポーネントを配布する"
  order: 7
---
# UI コンポーネントを配布する

プラグインから Hono JSX コンポーネントを export できますが、Riebeckite にコンポーネントレジストリはありません。サイトがコンポーネントを import し、どこに描画するかを決めます。レイアウトの所有権はサイト側に残ります。

プラグインのパッケージにコンポーネントを作ります。

```tsx
import type { PluginComponent } from "@riebeckite/core";

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
}) satisfies PluginComponent<SeriesListProps>;

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

---

[プラグイン機能別レシピに戻る](./README.ja.md) · [Plugin API](../../reference/plugin-api.ja.md)
