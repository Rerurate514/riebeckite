---
date: 2026-11-05
title: プロジェクト構成
sidebar:
  label: プロジェクト構成
  order: 20
---
# プロジェクト構成

生成された Riebeckite サイトは小さな静的サイトプロジェクトです。コンテンツとサイト実装を一緒に置くことも、分けることもできます。対応する配置は次の3つです。

| 配置 | コンテンツ | サイト実装 | 向いている場面 |
| --- | --- | --- | --- |
| 一体型 | サイトリポジトリ内の `content/` | 同じリポジトリ | 1人、または1つのリポジトリで全体を管理する |
| ディレクトリ分離型 | `site/` の隣の `vault/` | 同じリポジトリ | Obsidian Vault とサイト実装を明確に分けたい |
| リポジトリ分離型 | 別リポジトリ | 専用リポジトリ | サイト実装を触らずに記事だけ更新したい |

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

サイトのワークフローは、ビルド前に Vault を `content/` へチェックアウトします。Vault のワークフローは push 後に `repository_dispatch` をサイトへ送ります。

## 次に読む

- [コンテンツの場所](./content-location.ja.md)
- [一体型セットアップ](./integrated-setup.ja.md)
- [ディレクトリ分離型セットアップ](./separate-directories-setup.ja.md)
- [リポジトリ分離型セットアップ](./separate-repositories-setup.ja.md)
- [公式サンプル](https://github.com/Rerurate514/riebeckite-e2e-integrated)
