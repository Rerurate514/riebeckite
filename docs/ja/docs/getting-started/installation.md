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

```bash
npx create-riebeckite my-site
cd my-site
npm install
```

既定の preset は `starter` です。迷ったら `starter` のままで進めてください。別の preset を選ぶ場合だけ指定します。

```bash
npx create-riebeckite my-site --preset minimal
npx create-riebeckite --list-presets
```

既存ディレクトリへ生成する場合、既存ファイルと衝突すると停止します。上書きしてよいと分かっている場合だけ `--force` を使います。

## 生成される主なファイル

| ファイルやフォルダ | 役割 |
| --- | --- |
| `riebeckite.config.ts` | サイト名、URL、言語、Theme、Plugin の設定 |
| `content/` | Markdown を置く場所 |
| `app/` | 生成サイトのアプリ部分。通常は最初に触らなくてよい |
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
