---
date: 2026-10-08
title: プリセット
sidebar:
  label: プリセット
  order: 40
---
# プリセット

`create-riebeckite` は**[[glossary/preset|プリセット]]**をもとに、[[glossary/plugin|プラグイン]]、[[glossary/theme|テーマ]]、初期コンテンツ、[[framework/honox-integration|HonoX]] アプリケーションのファイルを選び、サイト一式を生成します。既定値は `starter` です。

対話式の CLI は、実行中にプリセットの選択を求めます。迷ったら `starter` を選んでください。記事、タグ、シリーズを持つメディアを作る場合は、この質問で `blog` を選んでください。`starter` に後から blog 用のプラグインを追加するより簡単です。コマンドラインから指定する場合は `--preset <name>` を使います（既定は `starter`）。

```sh
npx create-riebeckite my-site --preset starter
npx create-riebeckite --list-presets
```

## 目的からプリセットを選ぶ

| 目的 | プリセット |
| --- | --- |
| Obsidian のようにノートを相互リンクして育てたい | `digital-garden` |
| 記事、タグ、[[glossary/series|シリーズ]]を持つメディアを作りたい | `blog` |
| プロダクトやプロジェクトのドキュメントを作りたい | `docs` |
| 選んだ作品と連絡先を見せるポートフォリオを作りたい | `portfolio` |
| アプリケーションを自分で組み立てたい | `empty` |
| 公開できる最小の Markdown サイトがほしい | `minimal` |
| 実用的なデジタルガーデンやブログを始めたい | `starter`（既定） |
| 幅広いプラグインカタログ、描画例、リファレンスを確認したい | `showcase` |

迷ったら `starter` を選んでください。必要なプラグインは後から `riebeckite.config.ts` に追加できます。

## プリセットを比較する

| プリセット | テーマ | 言語 | コンテンツ | 主な機能 |
| --- | --- | --- | --- | --- |
| `starter` | `default` | サイトの[[glossary/locale|ロケール]]に応じた1言語 | index、guide、examples、相互リンクしたノート | Markdown の公開、[[glossary/search|検索]]、コンテンツから生成するナビゲーション、パンくず、[[glossary/backlink|バックリンク]]、関連記事と最新記事、taxonomy、フォルダのランディングページ、リンクプレビュー |
| `digital-garden` | `garden` | 英語 | index と相互リンクしたノート | Obsidian Markdown、frontmatter、wiki link と embed、バックリンク、ローカルグラフ、properties、検索、パンくず、taxonomy |
| `blog` | `editorial` | 英語 | index、記事、シリーズ | 記事、タグ、シリーズナビゲーション、関連記事と最新記事、共有操作、RSS/Atom/JSON feed、SEO、OG画像の自動生成、検索、目次 |
| `docs` | `default` | 英語 | ドキュメントのセクション | ドキュメント用サイドバー、レスポンシブな目次、前後ページへのリンク、検索可能なコード例、共通のサイトヘッダーとフッター |
| `portfolio` | `folio` | 英語 | ホーム、About、Projects、Contact | プロジェクトを中心にしたコンテンツ、レスポンシブ画像、lightbox、メディア埋め込み、gallery、SEO、ナビゲーション、properties、[[glossary/color-mode|カラーモード]] |
| `minimal` | `minimal` | 英語 | index 1ページ | Obsidian Markdown のみ |
| `showcase` | `default` | 7言語 | ツアー、guide、examples、プラグインとテーマのリファレンス、ローカルの fixture | 幅広いプラグイン、図表、チャート、デイリーノート、ナレッジ機能、診断、デプロイ |
| `empty` | なし | なし | なし | 空のアプリケーションシェル |

`showcase` の7言語は、英語、日本語、簡体字中国語、スペイン語、ドイツ語、フランス語、韓国語です。`starter` は単一言語のサイトです。ホームページは設定したロケールに従いますが、ガイドとサンプルノートは英語のみです。翻訳済みのルートが必要になったら l10n を追加してください。`minimal` は英語のみで、`empty` にはテーマ、プラグイン、コンテンツがありません。

### `starter`

実用的な既定構成です。Obsidian Markdown、カラーモード、SEO、目次、properties と alias、コード表示の拡張、検索と発見の導線、パンくず、レスポンシブ画像と lightbox、taxonomy、フォルダのランディングページ、リンクプレビューを含みます。ナビゲーションはサンプル用の固定 URL ではなく、公開済みのコンテンツから組み立てます。相互リンクしたサンプルノートで、バックリンク、関連記事、検索、最新記事、タグを試せます。ニッチな統合は含みません。

### `digital-garden`

Obsidian を意識した、相互リンクするノートのための構成です。生成されるコンテンツで frontmatter、wiki link、embed、properties、バックリンク、ローカルグラフを確認できます。ナビゲーション、パンくず、taxonomy、検索、リンクプレビューも最初から含むため、追加設定なしでノートのつながりをたどれます。

### `blog`

記事の公開を中心にした構成です。記事、タグ、シリーズ、関連記事と最新記事、共有操作、検索、目次を含みます。生成される設定では RSS、Atom、JSON feed を明示的に有効にし、公開ページごとに Open Graph 画像を生成します。サンプル記事でシリーズナビゲーションと taxonomy を確認できます。

### `docs`

ドキュメント用のサイドバー、レスポンシブな目次、前後ページへのナビゲーションを備えた構成です。小さなドキュメントツリーとコード例から始められ、現在読んでいるページに集中できるレイアウトです。トップページ、ヘッダー、3カラムの閲覧シェル、フッターは Riebeckite のウェブサイトと同じ構成です。

### `portfolio`

選んだプロジェクト、自己紹介、連絡先を載せるための控えめな構成です。画像がなくてもプロジェクトページを読めるようにしつつ、必要になればレスポンシブ画像、lightbox、メディア埋め込み、Markdown の gallery を使えます。レスポンシブ画像は既存の画像バリアントを再利用するため、WebP や AVIF への変換が必要なら `imageOptimizer` プラグインを追加してください。経歴、顧客、成果について、テンプレートが事実でない主張をすることはありません。

## コンテンツを置く場所

プリセットごとに Markdown を置くフォルダと一覧の作り方が異なります。

| プリセット | 主なフォルダ | 補足 |
| --- | --- | --- |
| `starter` | `content/` | ホームページとサンプルノートが直下および `content/notes/` にあります |
| `digital-garden` | `content/` | ノートは `content/notes/` にあり、wiki link でつながります |
| `blog` | `content/posts/` | 各記事が 1 ページになります。タグとシリーズは frontmatter から読み取ります |
| `docs` | `content/docs/` | フォルダ単位でページをまとめます。サイドバーの位置はネストした `sidebar.order` で指定し、`##` 見出しが目次になります |
| `portfolio` | `content/projects/` | `/projects/` の一覧が生成され、各 Markdown ファイルがプロジェクトページになります |
| `minimal` | `content/` | `content/index.md` の 1 ページだけです |
| `showcase` | `content/` | 描画例とリファレンスが `content/` 配下の複数フォルダに分かれています |

docs プリセットはトップレベルの `order` ではなく、frontmatter のサイドバー設定から並び順を読み取ります。

```yaml
---
title: Getting started
publish: true
sidebar:
  order: 1
---
```

## 任意の Feature Pack

Feature Pack は、選んだプリセットに Plugin を明示的に追加します。`--features <names>` にカンマ区切りで指定するか、対話式の質問で選んでください。

```sh
npx create-riebeckite my-site --preset portfolio --features diagrams,i18n
```

| Pack | 追加する機能 |
| --- | --- |
| `knowledge` | リンクプレビューとローカルグラフ |
| `diagrams` | Mermaid と Graphviz の Markdown 図表 |
| `media` | 音声・動画の埋め込み、レスポンシブ画像、lightbox |
| `i18n` | 追加するコンテンツ向けの英語・日本語ローカライズ対応 |

プリセットに含まれる Plugin と重複する Pack は、重複した import を生成せずに無視されます。Pack を追加しないことを明示する場合は `--features none` を使えます。

### `minimal`

Obsidian Markdown、`minimal` テーマ、英語の1ページだけを含む構成です。小さなサイトや、意図的に小さく始めたい場合に向いています。

### `showcase`

自己完結したリファレンスサイトです。公開されているプラグインの大部分を有効にし、図表・チャート・コードの描画例、プラグインとテーマのリファレンス、SVG ・ PDF ・ Excalidraw ・ Canvas のローカル fixture を含みます。追加のインフラ、専用の fixture、サイト全体の URL 変更を必要とするプラグインは有効にせず、テンプレートを自己完結に保っています。`content/Daily/` のサンプルノートは、ホームページの Daily Notes ウィジェットに表示されます。実運用の既定構成ではなく、機能の確認や設定の参照用です。

### `empty`

プラグイン、テーマ、コンテンツ、コンポーネントを含まない空のアプリケーションシェルです。最初のルートは通常の HonoX `createRoute` ページです。Riebeckite のコンテンツ機能を追加する前に、`app/` でページ、HTML、JSX コンポーネント、CSS をそのまま追加できます。

### 生成された UI を編集するときの起点

生成されるアプリケーションのファイルは通常の TypeScript、JSX、HonoX のルートです。ページや API ルートは `app/routes/`、記事 [[glossary/ui|UI]] の並べ替えは `app/components/article.tsx`、ヘッダーとフッターは `app/components/site-header.tsx`、サイトの CSS は `app/style.css` と `app/styles/` を編集します。`SiteNav` をはじめとするプラグインの UI コンポーネントは、設定済みのデータを自分で解決します。そのため、サイト側のコンポーネントで[[glossary/manifest|マニフェスト]]を解決せず、必要な場所に配置してください。

## プリセットが書き出す設定を確認する

`starter` は実用的なプラグインの設定を出力し、`showcase` は設定リファレンスとしてすべてのオプションを出力します。`empty` と `minimal` の設定は意図的に小さくしています。詳細は [設定](../reference/configuration.ja.md) と `packages/plugins` の各 README を参照してください。

## プロジェクトファイルを別に選ぶ

プリセットはプロジェクトファイルを制御しません。`create-riebeckite` は `--utilities <names>` で選んだプロジェクトファイルを別途生成します。指定できる名前は `gitignore`、`editorconfig`、`gitattributes`、`biome`、`npmrc`、`vscode` です。既定は `gitignore,editorconfig,gitattributes,biome` です。`none` を指定するとプロジェクトファイルを生成しません。対話式では `Customize extra project files?` で `Yes` を選ぶと、`Extra project files` の質問で個別に切り替えられます。各名前が生成するファイルは [CLI リファレンス](../reference/cli.ja.md) を参照してください。

## 次に読むページ

- [デプロイ →](./deployment.ja.md)
