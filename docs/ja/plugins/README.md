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

- Obsidian / Markdown: [obsidian-markdown](./obsidian-markdown.md), [properties](./properties.md), [alias](./alias.md), [permalink](./permalink.md)
- 図表: [mermaid](./mermaid.md), [graphviz](./graphviz.md), [d2](./d2.md), [plantuml](./plantuml.md), [chartjs](./chartjs.md), [vega-lite](./vega-lite.md), [wavedrom](./wavedrom.md), [markmap](./markmap.md)
- ナレッジ・本文埋め込み: [canvas](./canvas.md), [bases](./bases.md), [excalidraw](./excalidraw.md), [dataview](./dataview.md), [query](./query.md), [kanban](./kanban.md), [local-graph](./local-graph.md)
- 独立ページ・発見性: [taxonomy](./taxonomy.md), [garden-explorer](./garden-explorer.md), [search](./search.md), [backlinks](./backlinks.md), [related-posts](./related-posts.md), [recent-posts](./recent-posts.md), [toc](./toc.md)
- メディア: [attachment](./attachment.md), [pdf](./pdf.md), [media](./media.md), [responsive-image](./responsive-image.md), [lightbox](./lightbox.md), [gallery](./gallery.md), [rich-embed](./rich-embed.md)
- 運用・品質: [l10n](./l10n.md), [seo](./seo.md), [deploy](./deploy.md), [diagnostics](./diagnostics.md), [quality](./quality.md), [analytics](./analytics.md)

`taxonomy` と `garden-explorer` は、共通 catch-all route から独立ページを提供する Page Type です。`canvas`、`bases`、`excalidraw` は記事本文を描画する renderer であり、意図的に Page Type を提供しません。Plugin のページを作る場合は [Page System](../framework/page-system.md) を参照してください。

実例は [Plugin Showcase](./showcase.md)、Plugin を作る場合は [Writing a Plugin](./writing-a-plugin.md)、API は [Plugin API](../reference/plugin-api.md) を参照してください。

