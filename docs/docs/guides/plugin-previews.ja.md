---
title: Plugin Previews
---
# Plugin Previews

[Playground](/playground) では、対応する Markdown プラグインをサイトと同じ
Riebeckite のパイプラインで試せます。フィクスチャを選び、Markdown を編集し、公開された
プラグインオプション、テーマ、カラーモードを切り替えて結果を確認します。

[English](./plugin-previews.md)

## 対応プラグイン

| プラグイン | フィクスチャ | プレビューオプション | パイプラインの結果 |
| --- | --- | --- |
| Auto Card Link | リンクカード | なし | Markdown 変換、静的なカード |
| Code Annotations | Diff 注釈 | なし | HTML 変換 |
| Code Enhance | 行の強調 | `copyLabel` | HTML 変換、操作部は無効 |
| Code Tabs | 基本のタブ、分離したグループ | `syncTabs` | HTML 変換、すべてのパネルを静的に表示 |
| Hard Breaks | ソフト改行 | なし | Markdown 変換 |
| Highlight | テキストの強調 | `tag` | Markdown 変換 |
| Lightbox | 拡張画像 | なし | HTML 変換、画像リンクのみ |
| Obsidian Markdown | Callout とタグ | なし | Markdown 変換 |
| Sidenotes | 脚注の変換 | プラグイン既定値 | HTML 変換、ポップオーバーは無効 |
| Shortcodes | Note ショートコード | プラグイン既定値 | Markdown 変換 |

利用できるのはホストが登録したプラグインだけです。プレビューディスクリプターには ID、表示名、
ブラウザーでの可用性、フィクスチャ、オプションスキーマ、実際のプラグインファクトリーを定義します。
Playground とドキュメント内のプレビューは同じレジストリーを利用します。

## プレビューを定義する

フィクスチャとオプションは、ホスト側のプラグイン登録と並べて定義します。UI で扱え、サーバー側で
プラグイン生成前に検証できるよう、値は boolean、string、number、enum に限定します。

```ts
registry.register({
  id: "example",
  title: "Example",
  availability: "browser",
  fixtures: [{ id: "basic", title: "Basic", markdown: "# Example" }],
  options: {
    enabled: { type: "boolean", title: "Enabled", default: true },
  },
  create: (options) => examplePlugin(options),
});
```

プラグイン ID とフィクスチャ ID は重複しない値にします。レジストリーは不正なスキーマ、重複 ID、
未知のフィクスチャとオプション、不正な型の値を拒否します。

## セキュリティと制限

公開エンドポイントが受け付けるのは、登録済みのプラグイン ID、そのプラグイン自身のフィクスチャ ID、
スキーマに適合するオプションだけです。リクエストごとに Markdown は最大 100 KiB、シリアライズした
オプションは最大 10 KiB です。実際のパイプラインで変換した後の HTML をサニタイズし、空の sandbox と
制限付き CSP を持つ iframe に表示します。

## 互換性一覧

`packages/plugins` 配下のすべてのパッケージを以下のように分類しています。実際のパイプライン出力を
サニタイズ後も意味のある形で表示でき、クライアントエントリーを実行しなくてよいものだけを Playground に
登録しています。対応プラグインのフィクスチャと公開オプションは上の表に示し、スタイルは隔離された文書へ
読み込みます。

| 分類 | パッケージ | 実行時の境界 |
| --- | --- | --- |
| 静的プレビューを登録 | `autocardlink`, `code-annotations`, `code-enhance`, `code-tabs`, `hard-breaks`, `highlight`, `lightbox`, `obsidian-markdown`, `sidenotes`, `shortcodes` | Markdown または HTML パイプライン。レンダラーによるビルドコンテキスト、ファイルアクセス、ネットワークリクエストはありません。 |
| サンドボックスでは忠実に表示できない | `chartjs`, `d2`, `discord-embed`, `graphviz`, `map`, `markmap`, `marp`, `media`, `mermaid`, `mermaid-pele`, `pdf`, `plantuml`, `qr-code`, `responsive-image`, `rich-embed`, `vega-lite`, `wavedrom` | クライアントライフサイクル、canvas/SVG/iframe 出力、添付ファイル解決、マニフェスト処理、または外部ネットワーク資源が必要です。これらはプレビューでは意図的に許可しません。 |
| サイトまたはビルドコンテキストが必要 | `alias`, `analytics`, `archive`, `attachment`, `backlinks`, `bases`, `breadcrumbs`, `canvas`, `changelog`, `citations`, `color-mode`, `daily-notes`, `dataview`, `deploy`, `diagnostics`, `diff`, `docs`, `excalibrain`, `excalidraw`, `flashcards`, `folder-pages`, `gallery`, `garden-explorer`, `hover-preview`, `kanban`, `l10n`, `local-graph`, `navigation`, `permalink`, `properties`, `quality`, `query`, `recent-posts`, `related-posts`, `rename`, `search`, `seo`, `series`, `share`, `taxonomy`, `text-fragment`, `toc`, `ux`, `webmention` | サイトマニフェスト、コンテンツグラフ、ファイルシステム、ルーティング、デプロイ状態、検索インデックス、またはホスト側クライアント統合が必要です。 |

未登録のパッケージは模倣せず、意図的に未対応としています。特に Mermaid、Chart.js、Dataview、Bases、Canvas、
Search、Graph 系のプラグインは、公開プレビューで忠実に再現するには隔離を弱める必要があります。

## クライアントエントリー

プレビュー内ではプラグインのクライアントエントリーを実行しません。任意のスクリプトの実行、親ページへの
アクセス、任意のネットワークリクエストを防ぐためです。プレビューの操作部はサーバー側の結果を再描画しますが、
レンダリング結果内のプラグイン操作部は無効のままです。サイトマニフェスト、ページコンテキスト、外部サービス、
またはクライアントライフサイクルを必要とするプラグインは、適切なプレビューディスクリプターと隔離方法を
用意するまで利用できません。
