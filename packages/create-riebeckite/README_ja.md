# create-riebeckite

公式スターターテンプレートから、新しい Riebeckite サイトを作成するための
CLI ツールです。

[English](./README.md)

## 使い方

対話モード（推奨）: 引数なしで実行すると、プロジェクト名・preset・
機能パック・プロジェクトファイル・コンテンツの格納場所・デプロイ・
依存関係のインストールについて順に確認します。

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
| What would you like to build? | `Starter site`、`Digital garden`、`Blog`、`Docs`、`Portfolio`、`Minimal`、`Showcase`、`Empty` | 大半のサイトは `Starter site`（`starter`） |
| Add optional feature packs? | `Yes` または `No`。`Yes` なら機能パックを選択 | `No` |
| Customize extra project files? | `Yes` または `No`。`Yes` ならプロジェクトファイルを選択 | `No` で推奨セットを使用 |
| Where will you write content? | `This project`、`Separate GitHub repository` | 最初は `This project` |
| Set up deployment? | `Cloudflare Workers`、`GitHub Actions`、`Not now` | 手元で試すなら `Not now` |
| Install dependencies now? | `Yes` または `No` | `Yes` |

`Separate GitHub repository` を選ぶと content と site のリポジトリ名も入力し、GitHub Actions のデプロイ設定が自動で構成されます。この構成は[content repository ガイド](../../docs/docs/guides/content-repositories.ja.md)に、デプロイの追加方法は [Deployment](../../docs/docs/getting-started/deployment.ja.md) にあります。

## オプション

| オプション | 説明 |
| --- | --- |
| `[directory]` | 生成先ディレクトリ（既定はカレントディレクトリ） |
| `--help`、`-h` | 使い方を表示して終了する |
| `--preset <name>` | 使用するスターター構成（既定は `starter`） |
| `--utilities <names>` | 生成するプロジェクトファイルをカンマ区切りで指定する（`gitignore`、`editorconfig`、`gitattributes`、`biome`、`npmrc`、`vscode`、または `none`。既定は `gitignore,editorconfig,gitattributes,biome`） |
| `--force` | 空でないディレクトリにも展開する |
| `--list-presets` | 利用可能な preset と説明を一覧表示して終了する |
| `--github-actions` | Cloudflare へのデプロイ workflow を生成する |
| `--cloudflare-workers` | Cloudflare Workers デプロイ設定を生成する |
| `--features <names>` | 追加のプラグインを追加するカンマ区切りの feature pack 名 |
| `--content-repository <owner/repository>` | このリポジトリをデプロイ時の content source にする。`--github-actions` と `--site-repository` が必要で、`github/notify-site.yml` も生成する。 |
| `--site-repository <owner/repository>` | 生成した記事通知 workflow の通知先 site リポジトリ。`--content-repository` と同時に必要。 |

たとえば、機能を一通り確認できる `showcase` preset で生成する場合は次のとおりです。

```sh
npx create-riebeckite my-site --preset showcase
```

## Project files

preset とは別に、`create-riebeckite` は任意のプロジェクトファイルを生成します。
`Customize extra project files?` の質問は既定が `No` で、推奨セットを生成します。
`Yes` を選ぶと個別に切り替えられます。非対話で実行する場合は、
カンマ区切りの `--utilities` で選択します。

| 名前 | ファイル | 既定 |
| --- | --- | --- |
| `gitignore` | `.gitignore` | 生成する |
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
| `starter` | 実用的な Markdown ガーデン。検索、ナビゲーション、読書に必要な機能を含みます。 |
| `digital-garden` | Obsidian 互換のデジタルガーデン。リンクされたノート、バックリンク、ローカルグラフを含みます。 |
| `blog` | タグ、シリーズ、関連記事、共有、フィードを備えた公開向けブログ。 |
| `docs` | 自動サイドバー、目次、前後ナビゲーションを備えたドキュメントサイト。 |
| `portfolio` | プロジェクトと連絡先のための落ち着いたポートフォリオ。画像とメディアにも対応します。 |
| `minimal` | Riebeckite サイトの組み立て方を学ぶための最小構成。 |
| `showcase` | 描画例とリファレンスで Riebeckite のプラグインエコシステムを示す機能豊富な例。 |
| `empty` | Riebeckite の配線だけを含む空のキャンバス。テーマ、プラグイン、コンテンツは自分で追加します。 |

各 preset の説明は次のとおりです（`--list-presets` で表示される説明の日本語訳です）。

- `starter` — 実用的な Markdown ガーデン。検索、ナビゲーション、読書に必要な機能を含みます。
- `digital-garden` — Obsidian 互換のデジタルガーデン。リンクされたノート、バックリンク、ローカルグラフを含みます。
- `blog` — タグ、シリーズ、関連記事、共有、フィードを備えた公開向けブログ。
- `docs` — 自動サイドバー、目次、前後ナビゲーションを備えたドキュメントサイト。
- `portfolio` — プロジェクトと連絡先のための落ち着いたポートフォリオ。画像とメディアにも対応します。
- `minimal` — Riebeckite サイトの組み立て方を学ぶための最小構成。
- `showcase` — 描画例とリファレンスで Riebeckite のプラグインエコシステムを示す機能豊富な例。
- `empty` — Riebeckite の配線だけを含む空のキャンバス。テーマ、プラグイン、コンテンツは自分で追加します。

Riebeckite は、Markdown や Obsidian 由来のノートを Web で公開するための
拡張可能なフレームワークです。設定方法やプラグインについては
[Riebeckite ドキュメント](https://github.com/Rerurate514/riebeckite#readme)
を参照してください。
