---
date: 2026-11-05
title: コンテンツの場所
sidebar.label: コンテンツの場所
sidebar.order: 21
---
# コンテンツの場所

Riebeckite は1つのディレクトリから Markdown を読みます。場所は `riebeckite.config.ts` の `content.directory` で指定し、設定ファイルがあるディレクトリを基準に解決されます。

```ts
export default defineConfig({
  content: { directory: "content" },
});
```

サイトディレクトリの外を指しても構いません。

```ts
content: { directory: "../vault" },
```

ディレクトリ分離型で必要な設定はこれだけです。コンテンツディレクトリはプロジェクト内に制限されません。

## 場所の選び方

- **一体型:** サイト内の `content/` を使います。既定値で、最も簡単です。
- **ディレクトリ分離型:** サイトの隣に Vault を置き、`content.directory` を `../vault` にします。
- **リポジトリ分離型:** サイト側は `content` のままにし、GitHub Actions が Vault をそのパスへチェックアウトします。

`content.directory` を変えてもファイルは移動しません。先に Markdown と `assets/` を移動し、その後で設定を更新してください。

## コンテンツディレクトリに置くもの

- `index.md` や `notes/welcome.md` など、frontmatter 付きの Markdown。
- コンテンツから参照する画像・添付ファイルを入れる `assets/`。
- 任意のフォルダ構造。URL はファイルパスから `.md` を除いた形になります。

`package.json`、`app/`、ビルド出力は Vault に入れないでください。コンテンツディレクトリはコンテンツ専用です。

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

- [プロジェクト構成](./project-structure.ja.md)
- [一体型セットアップ](./integrated-setup.ja.md)
- [ディレクトリ分離型セットアップ](./separate-directories-setup.ja.md)
- [リポジトリ分離型セットアップ](./separate-repositories-setup.ja.md)
