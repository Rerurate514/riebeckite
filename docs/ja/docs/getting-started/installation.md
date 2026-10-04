---
title: Installation
sidebar:
  label: Installation
  order: 20
---
# Installation

Riebeckite でサイトを作るだけなら、この monorepo は clone しません。`create-riebeckite` がサイト用のファイルを生成します。

## 必要なもの

| 項目 | 用途 |
| --- | --- |
| Node.js LTS | Riebeckite のコマンドを動かす |
| npm | package のインストールに使う。Node.js に同梱されています |
| ターミナル | コマンドを実行する |
| Git | サイトをリポジトリとして管理するために使う |
| GitHub アカウント | GitHub Actions で自動デプロイするときに使う |
| Cloudflare アカウント | デプロイするときに使う |

確認します。

```bash
node -v
npm -v
git --version
```

どれもバージョンが表示されれば準備できています。Git が入っていない場合は [git-scm.com](https://git-scm.com/) からインストールしてください。手元から Cloudflare へ直接公開するだけの場合、Git と GitHub アカウントは後からでも構いません。自動デプロイ（[Deployment](./deployment.md)）のところで使います。

## サイトを作る

サイトを作るフォルダで、次のコマンドを実行します。

```bash
npx create-riebeckite
```

`npx` は `create-riebeckite` を一度だけ実行するため、グローバルには何も入れません。次の順に確認されます。

1. **Project name** — 作るフォルダ名。例: `my-site`
2. **Preset** — サイトの構成。迷ったら `starter` のまま。比較は [Presets](./presets.md)
3. **Content source** — `This project` は `content/` をサイト内に置く最も簡単な形。`Separate GitHub repository` は既存 Vault 向けの高度な構成で、content と site のリポジトリ名を入力すると GitHub Actions のデプロイ設定が自動で構成されます。詳細は [Content Repositories](../guides/content-repositories.md)
4. **デプロイ設定** — 既定値は `Not now` です。まず手元で確認したい場合は、そのまま Enter を押します。`Cloudflare Workers` は依存関係をインストールしたあとに `Deploy now?` を確認し、その場で初回公開まで進められます。`GitHub Actions` は push ごとの自動公開です。詳細は [Deployment](./deployment.md)

プロンプトの代わりにコマンドラインで同じ設定を渡すこともできます。

```bash
npx create-riebeckite my-site --preset starter
```

- 既存ディレクトリへ生成する場合、既存ファイルと衝突すると停止します。上書きしてよいと分かっている場合だけ `--force` を使います。
- 利用可能な preset は `npx create-riebeckite --list-presets` で確認できます。

続けて、フォルダへ移動して package を入れます。

```bash
cd my-site
npm install
```

`@riebeckite/*` は npm から入るので、これだけで足ります。最初の install は少し時間がかかることがあります。

## 生成される主なファイル

| ファイルやフォルダ | 役割 |
| --- | --- |
| `riebeckite.config.ts` | サイト名、URL、言語、Theme、Plugin の設定 |
| `content/` | Markdown を置く場所 |
| `app/` | 生成サイトのアプリ部分。通常は最初に触らなくてよい |
| `public/` | favicon・ヘッダーのロゴ・リンクプレビュー画像などの静的ファイル。差し替えは [サイトのアイコンとロゴ](../guides/branding.md) |
| `vite.config.ts` | ビルド設定。通常は変更しません |
| `package.json` | 依存 package とコマンド |
| `README.md` | 生成されたサイト向けの短い説明 |

通常の最初の構成は、site と content が同じリポジトリにある形です。

```text
my-site/
├─ content/
├─ app/
├─ riebeckite.config.ts
└─ package.json
```

content を別リポジトリに分ける構成は、必要になってから [Content Repositories](../guides/content-repositories.md) を読めば十分です。

## ディレクトリ構造

生成されたサイトのフォルダ構成はこちらです。

```text
my-site/
├─ content/               Your Markdown files
├─ public/                Static files
├─ app/                   Generated app code (rarely edited)
├─ riebeckite.config.ts   Site configuration
├─ package.json
├─ vite.config.ts
├─ tsconfig.json
├─ README.md
└─ dist/                  Production build output (after build)
```

## サイト設定を確認する

`riebeckite.config.ts` の `site` を確認します。

```ts
site: {
  title: "My Blog",
  description: "Notes from my days",
  baseUrl: "https://example.com",
  locale: "ja",
},
```

`baseUrl` は、公開 URL が決まったあとに実際の URL へ更新します。詳しい設定は [Configuration](../reference/configuration.md) を参照してください。

## 起動する

```bash
npm exec riebeckite dev
```

ターミナルに表示されたローカル URL をブラウザで開きます。Riebeckite のサイトが表示されれば成功です。

## よく使うコマンド

最初の導線では、次の2つだけで進められます。

```bash
npm exec riebeckite dev    # 開発サーバーを起動する
npm exec riebeckite build  # 公開用ファイルを dist/ に出力する
```

うまくいかないときや、設定・content の状態を詳しく確認したいときは、読み取り専用の診断コマンドもあります。詳しくは [CLI reference](../reference/cli.md) を参照してください。

## 次に読むページ

- [First Content →](./first-content.md)
