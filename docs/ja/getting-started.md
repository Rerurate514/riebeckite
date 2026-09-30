# Getting Started

「サイトをつくる → 設定する → 記事を書く → 動かす」までの最短ルートです。

環境の準備から Cloudflare への公開まで順番に学びたい場合や、もっと丁寧な説明がほしい場合は、[セットアップガイド](./setup.md) を先に読んでください。

## 必要なもの

- **Node.js（LTS）**: `node -v` で `v20` 以降になっていれば OK です。入っていなければ [nodejs.org](https://nodejs.org/ja) から。
- npm は Node.js に同梱されているので、追加のインストールは不要です。

> **npm 公開について**: 本体パッケージ（`@riebeckite/*`）は npm に公開されています。本ページのコマンドはそのまま使えます。

## 1. サイトをつくる

```sh
npx create-riebeckite my-site
cd my-site
npm install
npm run check
npm run doctor
```

- 生成されるのは、設定ファイル（`riebeckite.config.ts`）、HonoX の application shell（`app/`）、route、stylesheet、初期コンテンツ（`content/`）です。
- `create-riebeckite` は、中身のあるディレクトリには `--force` を付けない限り書き込みません。
- サイトの構成は `--preset <name>` で選べます（既定は `starter`）。一覧は `npx create-riebeckite --list-presets`。

`check` は設定と Plugin の解決を、`doctor` はコンテンツの読み込みまで含む健全性を確認します。どちらも書き込みをしません。チェックに成功すると次のように表示されます。

```text
Riebeckite configuration is valid.
```

## 2. 設定する

`riebeckite.config.ts` を最小構成からはじめます。

```ts
// riebeckite.config.ts
import { defineConfig } from "@riebeckite/core";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";
import { defaultTheme } from "@riebeckite/theme-default";

export default defineConfig({
  site: {
    title: "わたしのサイト",
    description: "日々のメモ",
    baseUrl: "https://example.com",
    locale: "ja",
  },
  content: {
    directory: "content",
  },
  theme: defaultTheme(),
  plugins: [obsidianMarkdown()],
});
```

| 項目 | 役割 |
| --- | --- |
| `site` | タイトル・URL・言語などの基本情報（SEO やフィードにも使われる） |
| `content.directory` | 記事を置くフォルダ。既定は `content/`。外部 Vault を使う場合は [記事とサイトのリポジトリ分離](./content-and-site-repos.md) を参照 |
| `theme` | 見た目。まずは `defaultTheme()` から |
| `plugins` | 機能。例では Obsidian 由来の Markdown を処理する `obsidianMarkdown()` のみ |

記事の公開判定は既定で **explicit**（`publish: true` が付いたものだけ公開）です。設定の詳細は [Configuration](./configuration.md) を参照してください。

## 3. 記事を書く

`content/` に Markdown を置きます。

```md
---
title: はじめまして
publish: true
---

最初の記事です。[[別の記事]] のような WikiLink も書けます。
```

`publish: true` が無いと explicit 方式では表示されません。読み込んだ状態は Inspector で確認できます（読み取り専用です）。

```sh
npm run inspect -- config
npm run inspect -- content --list
npm run inspect -- graph
```

- `inspect config` … 解決済みの設定とコンテンツの場所
- `inspect content --list` … 読み込まれたコンテンツの一覧
- `inspect graph` … WikiLink の関係

表示された内容を見て、設定やファイルを直してください（Inspector は状態を生成しません）。

## 4. 動かす

開発サーバーで確認します。

```sh
npm run dev
```

`http://localhost:5173` をブラウザで開くと記事が表示されます。編集はその場で反映され、停止は `Ctrl + C` です。

公開用ファイルを `dist/` に生成するにはビルドします。

```sh
npm run build
```

build は通常、変更の無いコンテンツを再利用する **incremental build** です。差分の再利用を避けたい場合だけ `build --full` を使ってください。

```sh
npm run build -- --full
```

サイトを拡張するときの置き場所は、「機能 → Plugin（[はじめてのプラグイン作成](./plugin-tutorial.md)）」「見た目 → Theme（[はじめてのテーマ作成](./theme-tutorial.md)）」「固有の route → App（`app/`）」です。全体像は [Architecture](./architecture.md) を参照してください。

## 次に読む

- [セットアップガイド](./setup.md) — 環境準備から公開まで通しで学ぶ
- [利用ガイド](./guide.md) — インストール〜デプロイのステップバイステップ
- [記事とサイトのリポジトリ分離](./content-and-site-repos.md) — 記事（Vault）とサイトを別々に管理する
- [Configuration](./configuration.md) / [Content System](./content-system.md) / [Plugin System](./plugin-system.md) / [Theme System](./theme-system.md)