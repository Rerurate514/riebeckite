# create-riebeckite

公式スターターテンプレートから、新しい Riebeckite サイトを作成するための
CLI ツールです。

[English](./README.md)

## 使い方

対話モード（推奨）: 引数なしで実行すると、プロジェクト名・preset・
プロジェクトファイル・コンテンツの格納場所・デプロイについて順に確認します。

```sh
npx create-riebeckite
```

引数を 1 つでも渡すと、従来どおり非対話で動作します。

```sh
npx create-riebeckite my-site
cd my-site
npm install
npm exec riebeckite build
```

## Choices

対話式の CLI は、次の順に確認します。

| 質問 | 選択肢 | 推奨 |
| --- | --- | --- |
| Project name | 作るフォルダ名（空なら既定の名前） | 任意。例: `my-site` |
| Preset | `starter`、`minimal`、`showcase`、`empty` | 大半のサイトは `starter` |
| Project files | `.gitignore`、`.editorconfig`、`.gitattributes`、`biome.json`、`.npmrc`、`.vscode/settings.json` | 推奨セットをあらかじめ選択 |
| Content source | `This project`、`Separate GitHub repository` | 最初は `This project` |
| デプロイ設定 | `GitHub Actions + Cloudflare Workers`、`Not now` | 手元で試すなら `Not now` |

`Separate GitHub repository` を選ぶと content と site のリポジトリ名も入力し、GitHub Actions のデプロイ設定が自動で構成されます。この構成は[content repository ガイド](../../docs/docs/guides/content-repositories.ja.md)に、デプロイの追加方法は [Deployment](../../docs/docs/getting-started/deployment.ja.md) にあります。

## オプション

| オプション | 説明 |
| --- | --- |
| `[directory]` | 生成先ディレクトリ（既定はカレントディレクトリ） |
| `--preset <name>` | 使用するスターター構成（既定は `starter`） |
| `--utilities <names>` | 生成するプロジェクトファイルをカンマ区切りで指定する（`gitignore`、`editorconfig`、`gitattributes`、`biome`、`npmrc`、`vscode`、または `none`。既定は `gitignore,editorconfig,gitattributes,biome`） |
| `--force` | 空でないディレクトリにも展開する |
| `--list-presets` | 利用可能な preset と説明を一覧表示して終了する |
| `--github-actions` | Cloudflare へのデプロイ workflow を生成する |
| `--content-repository <owner/repository>` | このリポジトリをデプロイ時の content source にする。`--github-actions` と `--site-repository` が必要で、`github/notify-site.yml` も生成する。 |
| `--site-repository <owner/repository>` | 生成した記事通知 workflow の通知先 site リポジトリ。`--content-repository` と同時に必要。 |

たとえば、機能を一通り確認できる `showcase` preset で生成する場合は次のとおりです。

```sh
npx create-riebeckite my-site --preset showcase
```

## Project files

preset とは別に、`create-riebeckite` は任意のプロジェクトファイルを生成します。
対話モードでは `Extra project files` の質問で推奨セットがあらかじめ選択されて
いるので、そこから個別に切り替えられます。非対話で実行する場合は、
カンマ区切りの `--utilities` で選択します。

| 名前 | ファイル | 既定 |
| --- | --- | --- |
| `editorconfig` | `.editorconfig` | 生成する |
| `gitattributes` | `.gitattributes` | 生成する |
| `biome` | `biome.json` | 生成する |
| `npmrc` | `.npmrc` | 生成しない |
| `vscode` | `.vscode/settings.json` | 生成しない |

`none` を渡すとプロジェクトファイルを一切生成しません。個別に選ぶ場合は
次のように指定します。

```sh
npx create-riebeckite my-site --utilities editorconfig,npmrc,vscode
```

## External content repository

別の記事リポジトリを使い、その `main` への push でデプロイする場合は、共通の
workflow を一度だけ生成します。preset による違いはありません。

```sh
npx create-riebeckite my-site --github-actions \
  --content-repository OWNER/notes \
  --site-repository OWNER/my-site
```

`content.directory` は `"content"` にし、必要な repository Secret を登録した後、
`github/notify-site.yml` を記事リポジトリの
`.github/workflows/notify-site.yml` にコピーします。詳細は[別記事リポジトリの
デプロイガイド](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/guides/deployment/separate-content-repository.md)を参照してください。

`--content-repository` を指定すると、外部 content の checkout、
`content-updated` の repository dispatch receiver、`github/notify-site.yml` がまとめて構成されます。以前の通知用オプションは廃止しました。

## Preset

利用可能な preset は `--list-presets` で確認できます。

```sh
npx create-riebeckite --list-presets
```

すべての preset は自己完結のスターターです。

| Preset | 用途 |
| --- | --- |
| `starter` | 大半のサイトにおすすめ |
| `minimal` | 最小限の設定で作る Markdown サイト |
| `showcase` | 描画例とローカルの fixture で Riebeckite の機能と Plugin を確認する構成 |
| `empty` | 独自構成のための空のシェル |

各 preset の説明は次のとおりです（`--list-presets` で表示される内容と同じです）。

- `starter` — 大半のサイト向け。Markdown の公開、検索、記事の発見に必要な機能を含みます。
- `minimal` — Obsidian Markdown、minimal Theme、1 ページだけの最小構成です。
- `showcase` — 全 Plugin カタログ、描画例、ローカルの fixture、リファレンスページを含みます。
- `empty` — Plugin・Theme・コンテンツ・コンポーネントを含まない空のシェルです。

Riebeckite は、Markdown や Obsidian 由来のノートを Web で公開するための
拡張可能なフレームワークです。設定方法やプラグインについては
[Riebeckite ドキュメント](https://github.com/Rerurate514/riebeckite#readme)
を参照してください。
