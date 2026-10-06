---
publish: true
---

# プラグイン

Riebeckite の力はプラグインエコシステムにあります——50 以上のパッケージが Markdown・描画・検索・SEO などを拡張します。ここでは代表的なプラグインを機能別に紹介します。各項目のリンクから詳細な README を参照できます。

## プラグインの追加

パッケージをインストール：

```sh
npm install @riebeckite/plugin-mermaid
```

`riebeckite.config.ts` の `plugins` 配列に登録：

```ts
import { defineConfig } from "@riebeckite/core";
import { l10n } from "@riebeckite/plugin-l10n";
import { mermaid } from "@riebeckite/plugin-mermaid";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";

export default defineConfig({
  // ...
  plugins: [obsidianMarkdown(), l10n({ ... }), mermaid()],
});
```

全プラグインの一覧はリポジトリにあります：

[GitHub の Riebeckite プラグイン](https://github.com/Rerurate514/riebeckite/tree/main/packages/plugins)

## マークダウンとノート

Obsidian ボールト向けの日常ノート機能。

| プラグイン | できること |
| --- | --- |
| [`@riebeckite/plugin-obsidian-markdown`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/obsidian-markdown/README.md) | Obsidian 風マークダウン：ウィキリンク・埋め込み・コールアウト・タグ。 |
| [`@riebeckite/plugin-attachment`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/attachment/README.md) | ウィキリンクによるファイル添付とアセットの埋め込み表示。 |
| [`@riebeckite/plugin-media`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/media/README.md) | プレーンなリンクから音声・動画を埋め込み。 |

## 図とプレゼンテーション

フェンスコードブロックを図やチャート、スライドに変換。

| プラグイン | できること |
| --- | --- |
| [`@riebeckite/plugin-mermaid`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/mermaid/README.md) | フェンスコードブロックから Mermaid 図を描画。 |
| [`@riebeckite/plugin-graphviz`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/graphviz/README.md) | DOT / Graphviz 図。 |
| [`@riebeckite/plugin-d2`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/d2/README.md) | D2 言語によるダイアグラム。 |
| [`@riebeckite/plugin-excalidraw`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/excalidraw/README.md) | Excalidraw スケッチファイルを描画。 |
| [`@riebeckite/plugin-gallery`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/gallery/README.md) | テーマやプロジェクトの紹介向けカードグリッド。 |

## コードと読書体験

読みやすいコードブロックと快適な読書体験。

| プラグイン | できること |
| --- | --- |
| [`@riebeckite/plugin-code-enhance`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/code-enhance/README.md) | シンタックスハイライト・行番号・コードツールバー。 |
| [`@riebeckite/plugin-code-tabs`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/code-tabs/README.md) | アクセシブルなタブ式コードブロック。 |
| [`@riebeckite/plugin-toc`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/toc/README.md) | スクロール追従の目次。 |
| [`@riebeckite/plugin-backlinks`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/backlinks/README.md) | 現在のノートを参照するノートを一覧表示。 |

## 検索とナビゲーション

ノートをすばやく探して移動する。

| プラグイン | できること |
| --- | --- |
| [`@riebeckite/plugin-search`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/search/README.md) | Ctrl+K モーダル付きのクライアント側全文検索。 |
| [`@riebeckite/plugin-garden-explorer`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/garden-explorer/README.md) | ノートのグラフと検索を探索するインタラクティブビュー。 |
| [`@riebeckite/plugin-local-graph`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/local-graph/README.md) | ノート周辺のリンクグラフ。 |
| [`@riebeckite/plugin-permalink`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/permalink/README.md) | 安定したカスタマイズ可能なパーマリンク。 |

## 公開と SEO

検索エンジンにも読者にも伝わるサイトを公開する。

| プラグイン | できること |
| --- | --- |
| [`@riebeckite/plugin-seo`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/seo/README.md) | SEO メタデータ・サイトマップ・RSS/Atom/JSON フィード・robots.txt。 |
| [`@riebeckite/plugin-l10n`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/l10n/README.md) | ローカライズ済み URL・言語スイッチャー・hreflang メタデータ——このサイトもこれで動いています。 |
| [`@riebeckite/plugin-rich-embed`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/rich-embed/README.md) | 外部リンクのビルド時リッチメディアカード。 |
| [`@riebeckite/plugin-deploy`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/deploy/README.md) | ホスティングサービス向けの静的デプロイ出力。 |

## コンテンツと開発体験

コンテンツを検索・整理し、健全に保つ。

| プラグイン | できること |
| --- | --- |
| [`@riebeckite/plugin-dataview`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/dataview/README.md) | ノートに対するビルド時クエリ。 |
| [`@riebeckite/plugin-kanban`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/kanban/README.md) | Markdown リストから Obsidian スタイルのカンバンボードを作成。 |
| [`@riebeckite/plugin-responsive-image`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/responsive-image/README.md) | レスポンシブ画像と遅延読み込み。 |
| [`@riebeckite/plugin-quality`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/quality/README.md) | 静的品質・アクセシビリティ検査。 |


Riebeckite: [documentation](https://github.com/Rerurate514/riebeckite/blob/main/docs/en/README.md) · [日本語ドキュメント](https://github.com/Rerurate514/riebeckite/blob/main/docs/ja/README.md)

