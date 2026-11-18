---
date: 2026-11-05
title: プロジェクト構成
sidebar.label: プロジェクト構成
sidebar.order: 70
aliases:
  - /ja/docs/getting-started/content-location
---
# プロジェクト構成

生成された Riebeckite サイトは小さな静的サイトプロジェクトです。コンテンツとサイト実装を一緒に置くことも、分けることもできます。対応する配置は次の3つです。

| 配置 | コンテンツ | サイト実装 | 向いている場面 |
| --- | --- | --- | --- |
| 一体型 | サイトリポジトリ内の `content/` | 同じリポジトリ | 1人、または1つのリポジトリで全体を管理する |
| ディレクトリ分離型 | `site/` の隣の `vault/` | 同じリポジトリ | Obsidian Vault とサイト実装を明確に分けたい |
| リポジトリ分離型 | 別リポジトリ | 専用リポジトリ | サイト実装を触らずに記事だけ更新したい |

コンテンツの場所は `riebeckite.config.ts` の `content.directory` で制御するため、配置の選択はそのまま設定の選択でもあります。

```ts
export default defineConfig({
  content: { directory: "content" },
});
```

ディレクトリはアプリケーションルート (`appRoot`) を基準に解決されます。通常は `riebeckite.config.ts` があるディレクトリです。サイトディレクトリの外を指しても構いません。

```ts
content: { directory: "../vault" },
```

ディレクトリ分離型で必要な設定はこれだけです。`content.directory` を変えてもファイルは移動しません。先に Markdown と `assets/` を移動し、その後で設定を更新してください。

## 一体型のファイル

```text
my-site/
├── content/
│   ├── index.md
│   ├── notes/
│   └── assets/
├── app/
├── public/
├── riebeckite.config.ts
├── package.json
├── wrangler.jsonc
└── .github/workflows/publish.yml
```

このツリーは `--github-actions` や `--cloudflare-workers` などのデプロイ指定を前提にしています。既定の `Not now` では `wrangler.jsonc` と `.github/workflows/publish.yml` は生成されません。

- `content/` が既定のコンテンツディレクトリです。
- `app/` には生成された HonoX アプリがあります。
- `public/` には favicon など、そのまま配信するファイルを置きます。
- `riebeckite.config.ts` で `site`、`content.directory`、テーマ、プラグインを設定します。
- `wrangler.jsonc` は Cloudflare Worker とカスタムドメインを定義します。
- `dist/` は `npm exec riebeckite build` が生成する出力で、コミットしません。

## ディレクトリ分離型

```text
my-project/
├── vault/
│   ├── index.md
│   ├── notes/
│   └── assets/
├── site/
│   ├── app/
│   ├── riebeckite.config.ts
│   ├── package.json
│   └── wrangler.jsonc
└── .github/workflows/publish.yml
```

`package.json` があるのはサイトディレクトリだけです。設定から Vault を参照します。

```ts
export default defineConfig({
  content: { directory: "../vault" },
  // ...
});
```

コマンドは `site/` で実行します。ワークフローには `working-directory: site` を設定し、push の対象パスに Vault を含めます。

## リポジトリ分離型

```text
my-site/                 my-vault/
├── app/                 ├── index.md
├── riebeckite.config.ts ├── notes/
├── package.json         └── assets/
└── .github/workflows/
```

この構成ではサイト側の `content.directory` は `content` のままにし、ビルド前に GitHub Actions が Vault をそのパスへチェックアウトします。Vault のワークフローは push 後に `repository_dispatch` をサイトへ送ります。

## コンテンツディレクトリに置くもの

- `index.md` や `notes/welcome.md` など、frontmatter 付きの Markdown。
- コンテンツから参照する画像・添付ファイルを入れる `assets/`。
- 任意のフォルダ構造。URL はファイルパスから `.md` を除いた形になります。

`package.json`、`app/`、ビルド出力はコンテンツディレクトリに入れないでください。コンテンツ専用です。

## 場所の確認

```sh
npm exec riebeckite check
npm exec riebeckite build
```

`check` は設定を検証します。`build` は指定ディレクトリが存在しない場合や、公開対象のページがない場合に失敗します。診断には `npm exec riebeckite doctor` を使います。

## 公式サンプル

- [一体型](https://github.com/Rerurate514/riebeckite-e2e-integrated) — [サイト](https://integrated.riebeckite.dev)
- [ディレクトリ分離型](https://github.com/Rerurate514/riebeckite-e2e-directories) — [サイト](https://directories.riebeckite.dev)
- [リポジトリ分離型](https://github.com/Rerurate514/riebeckite-e2e-site) — [サイト](https://repositories.riebeckite.dev)

## 次に読む

- [一体型セットアップ](./integrated-setup.ja.md)
- [ディレクトリ分離型セットアップ](./separate-directories-setup.ja.md)
- [リポジトリ分離型セットアップ](./separate-repositories-setup.ja.md)
- [ルートのリファレンス](../reference/configuration/roots.ja.md)
