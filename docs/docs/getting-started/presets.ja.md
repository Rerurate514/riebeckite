---
title: Presets
sidebar:
  label: Presets
  order: 40
---
# Presets

`create-riebeckite` は **preset** をもとに、Plugin、Theme、初期コンテンツ、HonoX アプリケーションのファイルを選んでサイト一式を生成します。既定値は `starter` です。

対話式の CLI は、実行中に preset を選ぶよう確認してきます。迷ったら `starter` を選びます。コマンドラインから指定する場合は `--preset <name>` を使います（既定は `starter`）。

```sh
npx create-riebeckite my-site --preset starter
npx create-riebeckite --list-presets
```

## どれを選ぶか

| 目的 | Preset |
| --- | --- |
| アプリケーションを自分で組み立てたい | `empty` |
| 公開できる最小の Markdown サイトがほしい | `minimal` |
| 実用的なガーデンやブログを始めたい | `starter`（既定） |
| Plugin 全体、描画例、リファレンスを確認したい | `showcase` |

迷ったら `starter` を選びます。必要な Plugin は後から `riebeckite.config.ts` に追加できます。

## 各 preset

| Preset | Theme | 言語 | コンテンツ | 主な機能 |
| --- | --- | --- | --- | --- |
| `starter` | `default` | 7言語 | index、guide、examples、相互リンクしたノート | Markdown 公開、検索、パンくず、バックリンク、関連記事・最新記事、taxonomy、series |
| `minimal` | `minimal` | 英語 | index 1ページ | Obsidian Markdown のみ |
| `showcase` | `default` | 7言語 | ツアー、guide、examples、Plugin/Theme reference、ローカル fixture | 全 Plugin カタログ、図表、チャート、デイリーノート、ナレッジ機能、診断、デプロイ |
| `empty` | なし | — | なし | 空のアプリケーションシェル |

7言語は英語、日本語、簡体字中国語、スペイン語、ドイツ語、フランス語、韓国語です。`minimal` は l10n を登録せず、`empty` には Theme、Plugin、コンテンツがありません。

### `starter`

実用サイト向けの既定構成です。Obsidian Markdown、カラーモード、l10n、SEO、目次、properties・alias、コード表示、検索・発見、パンくず、画像の最適表示と lightbox、series、taxonomy を含みます。相互リンクしたノートにより、バックリンク、関連記事、検索、最新記事、series、タグを試せます。ニッチな統合は含めません。

### `minimal`

Obsidian Markdown、`minimal` Theme、英語の1ページだけを含む構成です。小さなサイトや、意図的に小さく始めたい場合に向いています。

### `showcase`

自己完結したリファレンスサイトです。全 Plugin カタログを有効にし、図表・チャート・コードの描画例、Plugin と Theme のリファレンス、SVG・PDF・Excalidraw・Canvas のローカル fixture を含みます。`content/Daily/` のサンプルノートはホームページの Daily Notes ウィジェットに表示されます。実運用の既定構成ではなく、機能の確認や設定の参照用です。

### `empty`

Plugin、Theme、コンテンツ、コンポーネントを含まない空のアプリケーションシェルです。サイト構成から自分で作り、必要な部品を一つずつ追加する場合に選びます。

## 生成される設定

`starter` は実用的な Plugin の設定を出力し、`showcase` は設定リファレンスとして全オプションを出力します。`empty` と `minimal` の設定は意図的に小さくしています。詳細は [Configuration](../reference/configuration.ja.md) と `packages/plugins` の各 README を参照してください。

## Project file

preset は project file を制御しません。`create-riebeckite` は `--utilities <names>` で選んだ project file を別途生成します。指定できる名前は `editorconfig`、`gitattributes`、`biome`、`npmrc`、`vscode` で、既定は `editorconfig,gitattributes,biome` です。`none` を指定すると何も生成しません。対話式では `Extra project files` の質問で個別に切り替えられます。各名前が生成するファイルは [CLI Reference](../reference/cli.ja.md) を参照してください。

## 次に読むページ

- [Deployment →](./deployment.ja.md)

