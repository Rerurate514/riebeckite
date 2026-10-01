# Plugins

Plugin は、Riebeckite のサイトに機能を追加する仕組みです。通常の Markdown だけでは足りないとき、Obsidian 記法、検索、図表、メディア、SEO、記事の発見、多言語対応、診断などを追加できます。

## 何をしたいですか？

| やりたいこと | Plugin |
| --- | --- |
| Obsidian の WikiLink や埋め込みを使いたい | [Obsidian Markdown](./obsidian-markdown.md) |
| Mermaid を表示したい | [Mermaid](./mermaid.md) |
| サイト内検索を追加したい | [Search](./search.md) |
| タグや分類を使いたい | [Taxonomy](./taxonomy.md) |
| Backlink を表示したい | [Backlinks](./backlinks.md) |
| 画像を拡大表示したい | [Lightbox](./lightbox.md) |
| Excalidraw を表示したい | [Excalidraw](./excalidraw.md) |
| Obsidian Canvas を表示したい | [Canvas](./canvas.md) |
| 多言語サイトにしたい | [Localization](./l10n.md) |

この表は、目的から探すための入口です。すべての Plugin は下の一覧から確認できます。

## Plugin を追加する

package をインストールします。

```bash
npm install @riebeckite/plugin-search
```

`riebeckite.config.ts` の `plugins` に登録します。

```ts
import { searchPlugin } from "@riebeckite/plugin-search";

export default defineConfig({
  plugins: [searchPlugin()],
});
```

各 Plugin ページでは、package 名、import 名、よく使う設定を説明します。詳しい option は各 package README が正本です。

## 公式 Plugin

- [Alias](./alias.md)
- [Analytics](./analytics.md)
- [Attachment](./attachment.md)
- [Backlinks](./backlinks.md)
- [Bases](./bases.md)
- [Canvas](./canvas.md)
- [Changelog](./changelog.md)
- [Chart.js](./chartjs.md)
- [Code Enhance](./code-enhance.md)
- [Code Tabs](./code-tabs.md)
- [color-mode](./color-mode.md)
- [D2](./d2.md)
- [Dataview](./dataview.md)
- [Deploy](./deploy.md)
- [Diagnostics](./diagnostics.md)
- [Diff](./diff.md)
- [Excalidraw](./excalidraw.md)
- [Gallery](./gallery.md)
- [Garden Explorer](./garden-explorer.md)
- [Graphviz](./graphviz.md)
- [Kanban](./kanban.md)
- [Localization](./l10n.md)
- [Lightbox](./lightbox.md)
- [Local Graph](./local-graph.md)
- [Map](./map.md)
- [Markmap](./markmap.md)
- [Marp](./marp.md)
- [Media](./media.md)
- [Mermaid](./mermaid.md)
- [Obsidian Markdown](./obsidian-markdown.md)
- [PDF](./pdf.md)
- [Permalink](./permalink.md)
- [PlantUML](./plantuml.md)
- [Properties](./properties.md)
- [QR Code](./qr-code.md)
- [Quality](./quality.md)
- [Query](./query.md)
- [Recent Posts](./recent-posts.md)
- [Related Posts](./related-posts.md)
- [Responsive Image](./responsive-image.md)
- [Rich Embed](./rich-embed.md)
- [Search](./search.md)
- [SEO](./seo.md)
- [Taxonomy](./taxonomy.md)
- [Table of Contents](./toc.md)
- [Vega-Lite](./vega-lite.md)
- [WaveDrom](./wavedrom.md)

## Plugin を作りたい場合

まず [Writing a Plugin](./writing-a-plugin.md) を読んでください。正確な contract は [Plugin API](../reference/plugin-api.md)、ページ生成の仕組みは [Framework / Page system](../framework/page-system.md) にあります。

## 次に読むページ

- [Plugin Showcase](./showcase.md)
- [Writing a Plugin](./writing-a-plugin.md)
