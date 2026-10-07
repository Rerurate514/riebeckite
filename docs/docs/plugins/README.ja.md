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
| Obsidian の WikiLink や埋め込みを使いたい | [Obsidian Markdown](./obsidian-markdown.ja.md) |
| Mermaid を表示したい | [Mermaid](./mermaid.ja.md) |
| サイト内検索を追加したい | [Search](./search.ja.md) |
| タグや分類を使いたい | [Taxonomy](./taxonomy.ja.md) |
| Backlink を表示したい | [Backlinks](./backlinks.ja.md) |
| 画像を拡大表示したい | [Lightbox](./lightbox.ja.md) |
| Excalidraw を表示したい | [Excalidraw](./excalidraw.ja.md) |
| ノート間の関係図を表示したい | [ExcaliBrain](./excalibrain.ja.md) |
| Obsidian Canvas を表示したい | [Canvas](./canvas.ja.md) |
| BibTeX の引用を使いたい | [Citations](./citations.ja.md) |
| 多言語サイトにしたい | [Localization](./l10n.ja.md) |
| Docs 用の sidebar と previous/next を追加したい | [Docs](./docs.ja.md) |

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
| [Obsidian Markdown](./obsidian-markdown.ja.md) | WikiLink、埋め込み、callout など Obsidian 記法 |
| [Shortcodes](./shortcodes.ja.md) | 再利用できるインライン・ブロック・コンテナのディレクティブ |
| [Highlight](./highlight.ja.md) | Obsidian 風のインライン強調 |
| [Alias](./alias.ja.md) | Obsidian の alias によるリダイレクト |
| [Properties](./properties.ja.md) | frontmatter プロパティのパネル表示 |
| [Bases](./bases.ja.md) | Obsidian Bases のビルド時テーブル |
| [Citations](./citations.ja.md) | BibTeX・BibLaTeX の引用 |
| [Sidenotes](./sidenotes.ja.md) | モバイルのポップオーバー付きの傍注 |
| [Text Fragment](./text-fragment.ja.md) | Text Fragment リンクと引用 |
| [Diff](./diff.ja.md) | Git によるノートの差分と変更履歴 |
| [Daily Notes](./daily-notes.ja.md) | Daily Note のスニペット表示 |
| [Flashcards](./flashcards.ja.md) | コードブロックから作るフラッシュカード |
| [Kanban](./kanban.ja.md) | Obsidian Kanban のビルド時描画 |
| [Hover Preview](./hover-preview.ja.md) | 内部リンクのホバープレビュー |

### 図とプレゼンテーション

| Plugin | できること |
| --- | --- |
| [Mermaid](./mermaid.ja.md) | コードブロックからの Mermaid 図 |
| [D2](./d2.ja.md) | コードブロックからの D2 図 |
| [Graphviz](./graphviz.ja.md) | Graphviz の DOT グラフ |
| [PlantUML](./plantuml.ja.md) | コードブロックからの PlantUML 図 |
| [Chart.js](./chartjs.ja.md) | コードブロックからの Chart.js グラフ |
| [Vega-Lite](./vega-lite.ja.md) | コードブロックからの Vega-Lite 可視化 |
| [WaveDrom](./wavedrom.ja.md) | WaveDrom のタイミング図 |
| [Markmap](./markmap.ja.md) | Markmap による Markdown マインドマップ |
| [Marp](./marp.ja.md) | ビルド時の Marp スライド |
| [Excalidraw](./excalidraw.ja.md) | Excalidraw 添付の描画 |
| [ExcaliBrain](./excalibrain.ja.md) | ノートの関係マップ |

### ビジュアルとメディア

| Plugin | できること |
| --- | --- |
| [Attachment](./attachment.ja.md) | 添付ファイルのリンクと埋め込み |
| [Media](./media.ja.md) | タイムスタンプ指定付きの音声・動画埋め込み |
| [Responsive Image](./responsive-image.ja.md) | レスポンシブ画像と遅延読み込み |
| [Gallery](./gallery.ja.md) | Markdown で書くカードギャラリー |
| [Lightbox](./lightbox.ja.md) | クリックで拡大する画像表示 |
| [PDF](./pdf.ja.md) | PDF 添付のインライン表示 |
| [QR Code](./qr-code.ja.md) | コードブロックからのインライン SVG QR コード |
| [Map](./map.ja.md) | OpenStreetMap の対話的・静的な埋め込み |
| [Rich Embed](./rich-embed.ja.md) | ビルド時のリッチメディア埋め込み |
| [AutoCardLink](./autocardlink.ja.md) | `cardlink` ブロックからのリンクプレビューカード |

### コードと読書体験

| Plugin | できること |
| --- | --- |
| [Code Enhance](./code-enhance.ja.md) | 拡張したシンタックスハイライト |
| [Code Tabs](./code-tabs.ja.md) | アクセシブルなタブ付きコードブロック |
| [Code Annotations](./code-annotations.ja.md) | コードの注釈・強調・差分マーカー |
| [Table of Contents](./toc.ja.md) | スクロールに追従する目次 |
| [UX](./ux.ja.md) | 読書体験の強化 |
| [color-mode](./color-mode.ja.md) | ライト・ダーク・システムの切り替え |

### 検索とナビゲーション

| Plugin | できること |
| --- | --- |
| [Search](./search.ja.md) | クライアントサイドの全文検索 |
| [Navigation](./navigation.ja.md) | vault 由来または設定で書くサイトナビゲーション |
| [Backlinks](./backlinks.ja.md) | 公開ノートの被リンク一覧 |
| [Breadcrumbs](./breadcrumbs.ja.md) | slug 階層のパンくず |
| [Local Graph](./local-graph.ja.md) | ローカルノートグラフ |
| [Garden Explorer](./garden-explorer.ja.md) | グラフと検索の探索 UI |
| [Recent Posts](./recent-posts.ja.md) | 最近の記事一覧 |
| [Related Posts](./related-posts.ja.md) | ビルド時の関連記事ナビゲーション |
| [Series](./series.ja.md) | 連載記事の順序付きナビゲーション |
| [Taxonomy](./taxonomy.ja.md) | タグとフォルダの分類、用語別フィード、SEO |
| [Query](./query.ja.md) | コードブロックからのビルド時クエリ |
| [Dataview](./dataview.ja.md) | ビルド時の Dataview クエリ |
| [Folder Pages](./folder-pages.ja.md) | フォルダの入口ページと一覧生成 |
| [Archive](./archive.ja.md) | 月別アーカイブ一覧 |

### 公開と SEO

| Plugin | できること |
| --- | --- |
| [SEO](./seo.ja.md) | メタデータ、サイトマップ、フィード、robots.txt |
| [Deploy](./deploy.ja.md) | 静的ホスティング向けの出力 |
| [Permalink](./permalink.ja.md) | 安定した設定可能なパーマリンク |
| [Rename](./rename.ja.md) | 公開ノートのリネーム・移動リダイレクト |
| [Analytics](./analytics.ja.md) | 保存先に依存しない解析の基盤 |
| [Changelog](./changelog.ja.md) | Git による変更履歴とチェンジログ |
| [Webmention](./webmention.ja.md) | 検証済み Webmention の受信と表示 |
| [Share](./share.ja.md) | 記事ごとの共有リンクとクリップボードコピー |

### コンテンツと開発体験

| Plugin | できること |
| --- | --- |
| [Localization](./l10n.ja.md) | コンテンツの多言語化、ローカライズ URL、翻訳メタデータ |
| [Quality](./quality.ja.md) | HTML の品質とアクセシビリティの静的検査 |
| [Diagnostics](./diagnostics.ja.md) | Riebeckite と Obsidian vault のコンテンツ診断 |
| [Docs](./docs.ja.md) | Docs のサイドバーと previous/next |
| [Canvas](./canvas.ja.md) | Obsidian Canvas の描画 |
| [Discord Embed](./discord-embed.ja.md) | Discord のリンクプレビューメタデータ |

## Plugin を作りたい場合

まず [Writing a Plugin](./writing-a-plugin.ja.md) を読んでください。正確な contract は [Plugin API](../reference/plugin-api.ja.md)、ページ生成の仕組みは [Framework / Page system](../framework/page-system.ja.md) にあります。

## 次に読むページ

- [Plugin Showcase](./showcase.ja.md)
- [Writing a Plugin](./writing-a-plugin.ja.md)
