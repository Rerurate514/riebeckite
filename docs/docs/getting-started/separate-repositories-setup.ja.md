---
date: 2026-11-06
title: リポジトリ分離型セットアップ
sidebar.label: リポジトリ分離型セットアップ
sidebar.order: 24
---
# リポジトリ分離型セットアップ

リポジトリ分離型では、記事を置く Vault リポジトリと、サイトの実装を置くサイトリポジトリを分けて管理します。Vault に push すると、サイトのデプロイが始まります。

このページでは、GitHub と Cloudflare の画面でどこを開き、何を入力するかまで順に説明します。所要時間は20〜30分ほどです。

用意するもの:

- GitHub アカウント
- Node.js `^20.19.0` または `>=22.12.0`
- Cloudflare アカウント
- ターミナル

> GitHub の画面名や項目の位置は変わることがあります。このページは2026年11月時点の表示に合わせています。見つからない項目は、設定画面の検索欄で名前を探してください。

GitHub の設定はブラウザで行います。GitHub モバイルアプリには Developer settings がないためです。

公式サンプル: [site](https://github.com/Rerurate514/riebeckite-e2e-site) と [vault](https://github.com/Rerurate514/riebeckite-e2e-vault) — [repositories.riebeckite.dev](https://repositories.riebeckite.dev)

```text
my-vault/                 my-site/
├── index.md              ├── app/
├── notes/                ├── riebeckite.config.ts
└── assets/               ├── package.json
                          ├── wrangler.jsonc
                          └── .github/workflows/publish.yml
```

## 1. サイトをローカルに作る

ターミナルで、サイトを置きたいフォルダに移動してから実行します。

```sh
npx create-riebeckite my-site \
  --preset starter \
  --github-actions \
  --content-repository OWNER/my-vault \
  --site-repository OWNER/my-site
cd my-site
npm install
```

`OWNER` は GitHub のユーザー名または Organization 名に置き換えます。`my-vault` と `my-site` は、手順2で作るリポジトリ名と完全に一致させてください。

対話形式で作る場合は、`npx create-riebeckite my-site` を実行し、次のように答えます。

| 質問 | 答える内容 |
| --- | --- |
| Where will you write content? | `Separate GitHub repository` |
| Content repository | `OWNER/my-vault` |
| Site repository | `OWNER/my-site` |
| Install dependencies now? | 好みで `Yes` |

ほかにテンプレートや追加機能を聞かれます。希望がなければ既定のままで進めてください。

コンテンツを別リポジトリにすると、`Set up deployment?` は聞かれません。GitHub Actions 用のデプロイ設定が自動で入ります。

`github/notify-site.yml` は、この時点ではまだ動きません。手順6で Vault 側に置きます。

公開 URL が決まったら、`riebeckite.config.ts` の `site.baseUrl` に設定します。独自ドメインを使う場合は、`wrangler.jsonc` の `routes` も設定します。手順は[一体型セットアップ](./integrated-setup.ja.md)の手順2と同じです。まず `workers.dev` で公開するなら、生成された設定のままで進められます。

## 2. GitHub にリポジトリを2つ作る

GitHub の右上にある `+` → **New repository** を選び、次の2つを作ります。

| リポジトリ名 | 用途 | 公開範囲 |
| --- | --- | --- |
| `my-site` | サイトの実装 | Private |
| `my-vault` | 記事 | Private または Public |

どちらも **Initialize this repository with** の README、`.gitignore`、license は選ばず、空のまま **Create repository** を押します。空にしておくと、ローカルの最初の push がそのまま通ります。

> サイトのコードは、まだ push しません。Cloudflare の Secret を登録する前に push すると、最初のデプロイが失敗します。サイトは手順5で push します。

次に Vault の中身を作ります。既存の Obsidian Vault を使う場合は、そのフォルダをそのまま使えます。

```text
my-vault/
├── index.md
├── notes/
└── assets/
```

最小の `index.md` には frontmatter が必要です。

```md
---
publish: true
title: Home
---

# Home
```

Vault のフォルダで、次を実行します。

```sh
git init
git branch -M main
git add .
git commit -m "Add vault"
git remote add origin https://github.com/OWNER/my-vault.git
git push -u origin main
```

空のフォルダは Git に含まれないため、最初は `index.md` だけでも構いません。Vault は private のままでも大丈夫です。private Vault をサイトから読むためのトークンは、手順3で設定します。

## 3. GitHub App と Secret を設定する

Vault への push をサイトに伝えるには、Vault のワークフローからサイトへ通知を送ります。ここでは GitHub App を使います。

### 3-1. GitHub App を作る

1. GitHub 右上のプロフィール画像 → **Settings**。
2. 左サイドバーの一番下にある **Developer settings**。
3. **GitHub Apps** → **New GitHub App**。
4. 次の表のとおりに入力します。

| 項目 | 入力内容 |
| --- | --- |
| GitHub App name | 一意の名前（例: `riebeckite-notify-OWNER`） |
| Homepage URL | `https://github.com/OWNER/my-site` |
| Webhook → Active | チェックを外す |
| Repository permissions → Contents | **Read and write** |
| Where can this GitHub App be installed? | **Only on this account** |

5. **Create GitHub App** を押します。

作成後のページの上部に **App ID** が表示されます。あとで使うので控えてください。**Client ID** ではない点に注意します。

Organization のリポジトリを使う場合は、Organization の **Settings** → **Developer settings** → **GitHub Apps** から作ります。

### 3-2. 秘密鍵を作る

1. App の設定ページ左サイドバーで **Credentials** → **Key pairs** を開きます。
2. **New key** を押すと、秘密鍵（`.pem`）がダウンロードされます。このファイルは一度しかダウンロードできません。
3. 古い画面では **Private keys** → **Generate a private key** と表示されます。

### 3-3. サイトリポジトリに App をインストールする

1. App の設定ページ左サイドバーで **Install App**。
2. `OWNER` の横の **Install**。
3. **Only select repositories** を選び、`my-site` だけを選択。
4. **Install**。

Vault リポジトリにはインストールしません。

### 3-4. Vault に Secret を登録する

Vault リポジトリを開き、**Settings** → **Secrets and variables** → **Actions** → **New repository secret** から、次の2つを登録します。

| Name | Secret |
| --- | --- |
| `RIEBECKITE_APP_ID` | 3-1 で控えた App ID |
| `RIEBECKITE_APP_PRIVATE_KEY` | ダウンロードした `.pem` ファイルの中身 |

秘密鍵は `-----BEGIN ... PRIVATE KEY-----` から `-----END ... PRIVATE KEY-----` まで、ファイル全体を貼り付けます。

> 通知用トークンを置くのは **Vault** リポジトリ、Vault を読むためのトークンを置くのは **サイト** リポジトリです。向きを間違えやすいので注意してください。

### 3-5. private Vault を読むためのトークン

Vault が private または internal の場合、サイトリポジトリにも Secret が必要です。公開 Vault ならこの作業は不要です。

1. GitHub 右上のプロフィール画像 → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**。
2. **Token name** に `riebeckite-content-read` など。
3. **Expiration** を選ぶ。
4. **Resource owner** で Vault の所有者を選ぶ。
5. **Repository access** → **Only select repositories** → `my-vault`。
6. **Permissions** → **Repository permissions** → **Contents** を **Read-only**。
7. **Generate token**。表示されたトークンをコピーします。
8. **サイト**リポジトリの **Settings** → **Secrets and variables** → **Actions** → **New repository secret** で、`RIEBECKITE_CONTENT_READ_TOKEN` に貼り付けます。

### 3-6. GitHub App を使わない場合

App を作らずに Fine-grained PAT で通知する場合は、Vault リポジトリに `SITE_DISPATCH_TOKEN` を登録します。トークンはサイトリポジトリだけに限定し、**Contents: Read and write** を付けます。手順は 3-5 と同じで、リポジトリを `my-site`、権限を **Read and write** にします。

## 4. Cloudflare を設定する

### 4-1. アカウント ID を控える

1. Cloudflare ダッシュボードにログインします。
2. **Workers & Pages** を開きます。
3. 右側の **Account Details** に **Account ID** が表示されます。コピーします。

プロフィールメニューの **Copy account ID** でもコピーできます。

### 4-2. API トークンを作る

1. 右上のプロフィール画像 → **My Profile**。
2. **API Tokens** → **Create Token**。
3. **Create Custom Token** を選びます。
4. 次の3つの権限を追加します。

| スコープ | 権限 | レベル |
| --- | --- | --- |
| Account | Workers Scripts | Edit |
| Zone | Workers Routes | Edit |
| Zone | Zone | Read |

5. **Zone Resources** は、独自ドメインを使うゾーンを選びます。まだ決めていなければ **All zones** で構いません。
6. **Continue to summary** → **Create Token**。
7. 表示されたトークンをコピーします。この画面を閉じると再表示できません。

### 4-3. サイトリポジトリに登録する

サイトリポジトリの **Settings** → **Secrets and variables** → **Actions** で登録します。

- **Secrets** タブ → **New repository secret**: `CLOUDFLARE_API_TOKEN` に 4-2 のトークン
- **Variables** タブ → **New repository variable**: `CLOUDFLARE_ACCOUNT_ID` に 4-1 のアカウント ID

### 4-4. 公開 URL を設定する

`workers.dev` で公開する場合は、このままで構いません。独自ドメインを使う場合は、[一体型セットアップ](./integrated-setup.ja.md)の手順2に従って `wrangler.jsonc` の `routes` と `riebeckite.config.ts` の `site.baseUrl` を設定します。

## 5. サイトを push する

ローカルで確認する前に、記事リポジトリを `content/` にクローンしてください（生成時に `--clone-content` を指定しても同じです）。`content/` がない間は `check` と `build` が失敗します。

```sh
cd my-site
git clone https://github.com/OWNER/my-vault.git content
npm exec riebeckite check
npm exec riebeckite build
```

`dist/` が生成されればビルドは成功です。`dist/` と `node_modules/` と `content/` はコミットしません。

次に、サイトリポジトリへ push します。

```sh
git init
git branch -M main
git add .
git commit -m "Add site"
git remote add origin https://github.com/OWNER/my-site.git
git push -u origin main
```

サイトリポジトリの **Actions** タブを開き、**Deploy to Cloudflare Workers** が成功することを確認します。初回は数分かかります。

> 初回デプロイのあと、公開状態を保存する `publication-state` ブランチが自動作成されます。削除しないでください。

## 6. 通知ワークフローを置いて、動作を確認する

Vault リポジトリで、通知ワークフローを追加します。

1. Vault リポジトリの **Add file** → **Create new file**。
2. ファイル名に `.github/workflows/notify-site.yml` と入力します。`/` を入力するとフォルダが作られます。
3. ローカルの `my-site/github/notify-site.yml` の中身を貼り付けます。
4. **Commit changes...** → **Commit changes**。

このコミットが `main` への push になり、通知ワークフローが初回実行されます。Vault リポジトリの **Actions** タブで **Notify Riebeckite site** が成功することを確認してください。

続いて、サイトリポジトリの **Actions** タブで **Deploy to Cloudflare Workers** が `content-updated` で始まり、成功することを確認します。公開 URL を開き、Vault の `index.md` の内容が表示されれば完了です。

以降は、Vault に Markdown を push するたびに同じ流れが動きます。

### うまくいかない場合

| 症状 | 確認すること |
| --- | --- |
| Vault の Actions に **Notify Riebeckite site** が出ない | ファイルが `.github/workflows/notify-site.yml` にあるか。Vault の既定ブランチが `main` か |
| **Notify Riebeckite site** が失敗する | `RIEBECKITE_APP_ID` と `RIEBECKITE_APP_PRIVATE_KEY` が Vault にあるか。App ID が Client ID になっていないか。秘密鍵は BEGIN/END を含む全体か |
| サイトの Actions が始まらない | App が `my-site` にインストールされているか。App の Contents が **Read and write** か。PAT なら `SITE_DISPATCH_TOKEN` が Vault にあるか |
| サイトの checkout が失敗する | private Vault なら `RIEBECKITE_CONTENT_READ_TOKEN` がサイトにあるか。**Contents: Read-only** か |
| Cloudflare のデプロイが失敗する | `CLOUDFLARE_API_TOKEN` の権限と `CLOUDFLARE_ACCOUNT_ID` を確認する |
| ページが変わらない | サイトの Actions が成功しているか。Cloudflare の反映を数分待つ |

## 通知方法の比較

| 方法 | セットアップ | 有効期間 | 向いている場面 |
| --- | --- | --- | --- |
| GitHub App | App を作成してインストール | 実行ごとに数分 | 推奨の既定 |
| Fine-grained PAT | トークンを1つ作成 | 長期 | すぐ試したい |
| 定期ポーリング | cron トリガーを追加 | なし | 更新が少ない Vault |

Riebeckite の生成するワークフローは GitHub App と PAT のフォールバックに対応します。定期ポーリングは公開が遅れ、実行回数も増えるため生成しません。

## 次に読む

- [公開ワークフロー](../guides/deployment/publication-workflow.ja.md)
- [GitHub Actions](../guides/deployment/github-actions.ja.md)
- [コンテンツリポジトリ](../guides/content-repositories.ja.md)
