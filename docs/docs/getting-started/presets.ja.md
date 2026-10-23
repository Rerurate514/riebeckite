---
date: 2026-10-08
title: プリセット
sidebar:
  label: プリセット
  order: 40
---
# プリセット

`create-riebeckite` は**プリセット**をもとに、プラグイン、テーマ、初期コンテンツ、HonoX アプリケーションのファイルを選び、サイト一式を生成します。既定値は `starter` です。

対話式の CLI は、実行中にプリセットの選択を求めます。迷ったら `starter` を選んでください。コマンドラインから指定する場合は `--preset <name>` を使います（既定は `starter`）。

```sh
npx create-riebeckite my-site --preset starter
npx create-riebeckite --list-presets
```

## 目的からプリセットを選ぶ

| 目的 | プリセット |
| --- | --- |
| アプリケーションを自分で組み立てたい | `empty` |
| 公開できる最小の Markdown サイトがほしい | `minimal` |
| 実用的なデジタルガーデンやブログを始めたい | `starter`（既定） |
| プラグインのカタログ全体、描画例、リファレンスを確認したい | `showcase` |

迷ったら `starter` を選んでください。必要なプラグインは後から `riebeckite.config.ts` に追加できます。

## 4つのプリセットを比較する

| プリセット | テーマ | 言語 | コンテンツ | 主な機能 |
| --- | --- | --- | --- | --- |
| `starter` | `default` | サイトのロケールに応じた1言語 | index、guide、examples、相互リンクしたノート | Markdown の公開、検索、コンテンツから生成するナビゲーション、パンくず、バックリンク、関連記事と最新記事、taxonomy、フォルダのランディングページ、リンクプレビュー |
| `minimal` | `minimal` | 英語 | index 1ページ | Obsidian Markdown のみ |
| `showcase` | `default` | 7言語 | ツアー、guide、examples、プラグインとテーマのリファレンス、ローカルの fixture | すべてのプラグイン、図表、チャート、デイリーノート、ナレッジ機能、診断、デプロイ |
| `empty` | なし | なし | なし | 空のアプリケーションシェル |

`showcase` の7言語は、英語、日本語、簡体字中国語、スペイン語、ドイツ語、フランス語、韓国語です。`starter` はサイトのロケールから1言語を選んでページを生成します。翻訳済みのルートが必要になったら l10n を追加してください。`minimal` は英語のみで、`empty` にはテーマ、プラグイン、コンテンツがありません。

### `starter`

実用的な既定構成です。Obsidian Markdown、カラーモード、SEO、目次、properties と alias、コード表示の拡張、検索と発見の導線、パンくず、レスポンシブ画像と lightbox、taxonomy、フォルダのランディングページ、リンクプレビューを含みます。ナビゲーションはサンプル用の固定 URL ではなく、公開済みのコンテンツから組み立てます。相互リンクしたサンプルノートで、バックリンク、関連記事、検索、最新記事、タグを試せます。ニッチな統合は含みません。

### `minimal`

Obsidian Markdown、`minimal` テーマ、英語の1ページだけを含む構成です。小さなサイトや、意図的に小さく始めたい場合に向いています。

### `showcase`

自己完結したリファレンスサイトです。すべてのプラグインを有効にし、図表・チャート・コードの描画例、プラグインとテーマのリファレンス、SVG・PDF・Excalidraw・Canvas のローカル fixture を含みます。`content/Daily/` のサンプルノートは、ホームページの Daily Notes ウィジェットに表示されます。実運用の既定構成ではなく、機能の確認や設定の参照用です。

### `empty`

プラグイン、テーマ、コンテンツ、コンポーネントを含まない空のアプリケーションシェルです。最初のルートは通常の HonoX `createRoute` ページです。Riebeckite のコンテンツ機能を追加する前に、`app/` でページ、HTML、JSX コンポーネント、CSS をそのまま追加できます。

### 生成された UI を編集するときの起点

生成されるアプリケーションのファイルは通常の TypeScript、JSX、HonoX のルートです。ページや API ルートは `app/routes/`、記事 UI の並べ替えは `app/components/article.tsx`、ヘッダーとフッターは `app/components/site-header.tsx`、サイトの CSS は `app/style.css` を編集します。`SiteNav` をはじめとするプラグインの UI コンポーネントは、設定済みのデータを自分で解決します。そのため、サイト側のコンポーネントでマニフェストを解決せず、必要な場所に配置してください。

## プリセットが書き出す設定を確認する

`starter` は実用的なプラグインの設定を出力し、`showcase` は設定リファレンスとしてすべてのオプションを出力します。`empty` と `minimal` の設定は意図的に小さくしています。詳細は [設定](../reference/configuration.ja.md) と `packages/plugins` の各 README を参照してください。

## プロジェクトファイルを別に選ぶ

プリセットはプロジェクトファイルを制御しません。`create-riebeckite` は `--utilities <names>` で選んだプロジェクトファイルを別途生成します。指定できる名前は `gitignore`、`editorconfig`、`gitattributes`、`biome`、`npmrc`、`vscode` です。既定は `gitignore,editorconfig,gitattributes,biome` です。`none` を指定するとプロジェクトファイルを生成しません。対話式では `Extra project files` の質問で個別に切り替えられます。各名前が生成するファイルは [CLI リファレンス](../reference/cli.ja.md) を参照してください。

## 次に読むページ

- [デプロイ →](./deployment.ja.md)
