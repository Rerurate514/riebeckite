# Plugins

Plugin は Riebeckite の機能を追加します。Markdown 処理、検索、図表、メディア、SEO、診断、独立ページなどは Plugin として提供されます。

## 追加する

```bash
npm install @riebeckite/plugin-search
```

```ts
import { searchPlugin } from "@riebeckite/plugin-search"

export default defineConfig({
  plugins: [searchPlugin()],
})
```

`false`、`null`、`undefined` は無効な Plugin として扱われるため、条件付きで登録できます。

## 公式 Plugin の分類

- Obsidian / Markdown: [obsidian-markdown](../../../packages/plugins/obsidian-markdown/README.md), [properties](../../../packages/plugins/properties/README.md), [alias](../../../packages/plugins/alias/README.md), [permalink](../../../packages/plugins/permalink/README.md)
- 図表: [mermaid](../../../packages/plugins/mermaid/README.md), [graphviz](../../../packages/plugins/graphviz/README.md), [d2](../../../packages/plugins/d2/README.md), [plantuml](../../../packages/plugins/plantuml/README.md), [chartjs](../../../packages/plugins/chartjs/README.md), [vega-lite](../../../packages/plugins/vega-lite/README.md), [wavedrom](../../../packages/plugins/wavedrom/README.md), [markmap](../../../packages/plugins/markmap/README.md)
- ナレッジ・本文埋め込み: [canvas](../../../packages/plugins/canvas/README.md), [bases](../../../packages/plugins/bases/README.md), [excalidraw](../../../packages/plugins/excalidraw/README.md), [dataview](../../../packages/plugins/dataview/README.md), [query](../../../packages/plugins/query/README.md), [kanban](../../../packages/plugins/kanban/README.md), [local-graph](../../../packages/plugins/local-graph/README.md)
- 独立ページ・発見性: [taxonomy](../../../packages/plugins/taxonomy/README.md), [garden-explorer](../../../packages/plugins/garden-explorer/README.md), [search](../../../packages/plugins/search/README.md), [backlinks](../../../packages/plugins/backlinks/README.md), [related-posts](../../../packages/plugins/related-posts/README.md), [recent-posts](../../../packages/plugins/recent-posts/README.md), [toc](../../../packages/plugins/toc/README.md)
- メディア: [attachment](../../../packages/plugins/attachment/README.md), [pdf](../../../packages/plugins/pdf/README.md), [media](../../../packages/plugins/media/README.md), [responsive-image](../../../packages/plugins/responsive-image/README.md), [lightbox](../../../packages/plugins/lightbox/README.md), [gallery](../../../packages/plugins/gallery/README.md), [rich-embed](../../../packages/plugins/rich-embed/README.md)
- 運用・品質: [l10n](../../../packages/plugins/l10n/README.md), [seo](../../../packages/plugins/seo/README.md), [deploy](../../../packages/plugins/deploy/README.md), [diagnostics](../../../packages/plugins/diagnostics/README.md), [quality](../../../packages/plugins/quality/README.md), [analytics](../../../packages/plugins/analytics/README.md)

`taxonomy` と `garden-explorer` は、共通 catch-all route から独立ページを提供する Page Type です。`canvas`、`bases`、`excalidraw` は記事本文を描画する renderer であり、意図的に Page Type を提供しません。Plugin のページを作る場合は [Page System](../framework/page-system.md) を参照してください。

実例は [Plugin Showcase](./showcase.md)、Plugin を作る場合は [Writing a Plugin](./writing-a-plugin.md)、API は [Plugin API](../reference/plugin-api.md) を参照してください。

