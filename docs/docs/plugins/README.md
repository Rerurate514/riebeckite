---
title: Plugins
sidebar:
  label: Plugins
  order: 30
  collapsed: true
---
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
| ノート間の関係図を表示したい | [ExcaliBrain](./excalibrain.md) |
| Obsidian Canvas を表示したい | [Canvas](./canvas.md) |
| BibTeX の引用を使いたい | [Citations](./citations.md) |
| 多言語サイトにしたい | [Localization](./l10n.md) |
| Docs 用の sidebar と previous/next を追加したい | [Docs](./docs.md) |

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

各 Plugin ページでは、package 名、import 名、よく使う設定を説明します。詳しい option は各 package README を参照してください。

## 公式 Plugin

各ページから Plugin のリファレンスへ移動できます。導入は `npm install @riebeckite/plugin-<slug>` で行い、`riebeckite.config.ts` に登録します。

### Markdown とノート

| Plugin | できること |
| --- | --- |
| [Obsidian Markdown](./obsidian-markdown.md) | WikiLink、埋め込み、callout など Obsidian 記法 |
| [Shortcodes](./shortcodes.md) | 再利用できるインライン・ブロック・コンテナのディレクティブ |
| [Highlight](./highlight.md) | Obsidian 風のインライン強調 |
| [Alias](./alias.md) | Obsidian の alias によるリダイレクト |
| [Properties](./properties.md) | frontmatter プロパティのパネル表示 |
| [Bases](./bases.md) | Obsidian Bases のビルド時テーブル |
| [Citations](./citations.md) | BibTeX・BibLaTeX の引用 |
| [Sidenotes](./sidenotes.md) | モバイルのポップオーバー付きの傍注 |
| [Text Fragment](./text-fragment.md) | Text Fragment リンクと引用 |
| [Diff](./diff.md) | Git によるノートの差分と変更履歴 |
| [Daily Notes](./daily-notes.md) | Daily Note のスニペット表示 |
| [Flashcards](./flashcards.md) | コードブロックから作るフラッシュカード |
| [Kanban](./kanban.md) | Obsidian Kanban のビルド時描画 |
| [Hover Preview](./hover-preview.md) | 内部リンクのホバープレビュー |

### 図とプレゼンテーション

| Plugin | できること |
| --- | --- |
| [Mermaid](./mermaid.md) | コードブロックからの Mermaid 図 |
| [D2](./d2.md) | コードブロックからの D2 図 |
| [Graphviz](./graphviz.md) | Graphviz の DOT グラフ |
| [PlantUML](./plantuml.md) | コードブロックからの PlantUML 図 |
| [Chart.js](./chartjs.md) | コードブロックからの Chart.js グラフ |
| [Vega-Lite](./vega-lite.md) | コードブロックからの Vega-Lite 可視化 |
| [WaveDrom](./wavedrom.md) | WaveDrom のタイミング図 |
| [Markmap](./markmap.md) | Markmap による Markdown マインドマップ |
| [Marp](./marp.md) | ビルド時の Marp スライド |
| [Excalidraw](./excalidraw.md) | Excalidraw 添付の描画 |
| [ExcaliBrain](./excalibrain.md) | ノートの関係マップ |

### ビジュアルとメディア

| Plugin | できること |
| --- | --- |
| [Attachment](./attachment.md) | 添付ファイルのリンクと埋め込み |
| [Media](./media.md) | タイムスタンプ指定付きの音声・動画埋め込み |
| [Responsive Image](./responsive-image.md) | レスポンシブ画像と遅延読み込み |
| [Gallery](./gallery.md) | Markdown で書くカードギャラリー |
| [Lightbox](./lightbox.md) | クリックで拡大する画像表示 |
| [PDF](./pdf.md) | PDF 添付のインライン表示 |
| [QR Code](./qr-code.md) | コードブロックからのインライン SVG QR コード |
| [Map](./map.md) | OpenStreetMap の対話的・静的な埋め込み |
| [Rich Embed](./rich-embed.md) | ビルド時のリッチメディア埋め込み |
| [AutoCardLink](./autocardlink.md) | `cardlink` ブロックからのリンクプレビューカード |

### コードと読書体験

| Plugin | できること |
| --- | --- |
| [Code Enhance](./code-enhance.md) | 拡張したシンタックスハイライト |
| [Code Tabs](./code-tabs.md) | アクセシブルなタブ付きコードブロック |
| [Code Annotations](./code-annotations.md) | コードの注釈・強調・差分マーカー |
| [Table of Contents](./toc.md) | スクロールに追従する目次 |
| [UX](./ux.md) | 読書体験の強化 |
| [color-mode](./color-mode.md) | ライト・ダーク・システムの切り替え |

### 検索とナビゲーション

| Plugin | できること |
| --- | --- |
| [Search](./search.md) | クライアントサイドの全文検索 |
| [Navigation](./navigation.md) | vault 由来または設定で書くサイトナビゲーション |
| [Backlinks](./backlinks.md) | 公開ノートの被リンク一覧 |
| [Breadcrumbs](./breadcrumbs.md) | slug 階層のパンくず |
| [Local Graph](./local-graph.md) | ローカルノートグラフ |
| [Garden Explorer](./garden-explorer.md) | グラフと検索の探索 UI |
| [Recent Posts](./recent-posts.md) | 最近の記事一覧 |
| [Related Posts](./related-posts.md) | ビルド時の関連記事ナビゲーション |
| [Series](./series.md) | 連載記事の順序付きナビゲーション |
| [Taxonomy](./taxonomy.md) | タグとフォルダの分類、用語別フィード、SEO |
| [Query](./query.md) | コードブロックからのビルド時クエリ |
| [Dataview](./dataview.md) | ビルド時の Dataview クエリ |
| [Folder Pages](./folder-pages.md) | フォルダの入口ページと一覧生成 |
| [Archive](./archive.md) | 月別アーカイブ一覧 |

### 公開と SEO

| Plugin | できること |
| --- | --- |
| [SEO](./seo.md) | メタデータ、サイトマップ、フィード、robots.txt |
| [Deploy](./deploy.md) | 静的ホスティング向けの出力 |
| [Permalink](./permalink.md) | 安定した設定可能なパーマリンク |
| [Rename](./rename.md) | 公開ノートのリネーム・移動リダイレクト |
| [Analytics](./analytics.md) | 保存先に依存しない解析の基盤 |
| [Changelog](./changelog.md) | Git による変更履歴とチェンジログ |
| [Webmention](./webmention.md) | 検証済み Webmention の受信と表示 |
| [Share](./share.md) | 記事ごとの共有リンクとクリップボードコピー |

### コンテンツと開発体験

| Plugin | できること |
| --- | --- |
| [Localization](./l10n.md) | コンテンツの多言語化、ローカライズ URL、翻訳メタデータ |
| [Quality](./quality.md) | HTML の品質とアクセシビリティの静的検査 |
| [Diagnostics](./diagnostics.md) | Riebeckite と Obsidian vault のコンテンツ診断 |
| [Docs](./docs.md) | Docs のサイドバーと previous/next |
| [Canvas](./canvas.md) | Obsidian Canvas の描画 |
| [Discord Embed](./discord-embed.md) | Discord のリンクプレビューメタデータ |

## Plugin を作りたい場合

まず [Writing a Plugin](./writing-a-plugin.md) を読んでください。正確な contract は [Plugin API](../reference/plugin-api.md)、ページ生成の仕組みは [Framework / Page system](../framework/page-system.md) にあります。

## 次に読むページ

- [Plugin Showcase](./showcase.md)
- [Writing a Plugin](./writing-a-plugin.md)
