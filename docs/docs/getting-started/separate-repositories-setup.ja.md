---
date: 2026-11-05
title: リポジトリ分離型セットアップ
sidebar:
  label: リポジトリ分離型セットアップ
  order: 24
---
# リポジトリ分離型セットアップ

リポジトリ分離型では、コンテンツとサイト実装を別リポジトリで管理します。Vault リポジトリへの push で、サイトリポジトリのデプロイを開始できます。

公式サンプル: [site](https://github.com/Rerurate514/riebeckite-e2e-site) と [vault](https://github.com/Rerurate514/riebeckite-e2e-vault) — [repositories.riebeckite.dev](https://repositories.riebeckite.dev)

```text
my-vault/                 my-site/
├── index.md              ├── app/
├── notes/                ├── riebeckite.config.ts
└── assets/               ├── package.json
                          ├── wrangler.jsonc
                          └── .github/workflows/publish.yml
```

## 1. サイトを作る

```sh
npx create-riebeckite my-site \
  --preset starter \
  --github-actions \
  --content-repository OWNER/my-vault \
  --site-repository OWNER/my-site
cd my-site
npm install
```

ビルド前に Vault を `content/` へチェックアウトするワークフローが生成されます。同時に `github/notify-site.yml` も作られますが、これはテンプレートで、まだ有効なワークフローではありません。

## 2. Vault を用意する

`index.md`、`notes/`、`assets/` を持つ Vault リポジトリを作ります。最小の `index.md` には frontmatter が必要です。

```md
---
publish: true
title: Home
---

# Home
```

## 3. 通知ワークフローをコピーする

`github/notify-site.yml` を Vault リポジトリの `.github/workflows/notify-site.yml` にコピーします。`main` への push ごとに、サイトリポジトリへ `content-updated` を送ります。

## 4. 認証を設定する

GitHub App を使うと、実行ごとに短期トークンを発行できます。

1. 自分のアカウント所有の GitHub App を作成する。Webhook は無効にする。
2. Repository permissions は **Contents: read and write** と **Metadata: read-only** にする。
3. App をサイトリポジトリだけにインストールする。
4. **Vault** リポジトリに Secret `RIEBECKITE_APP_ID` と `RIEBECKITE_APP_PRIVATE_KEY` を登録する。秘密鍵は PEM 形式で貼り付ける。

ワークフローは `actions/create-github-app-token` でトークンを発行し、`createDispatchEvent` を呼びます。長期トークンは保存しません。

GitHub App を作れない場合は、Vault リポジトリに `SITE_DISPATCH_TOKEN` を設定します。サイトリポジトリだけに限定した Fine-grained PAT に **Contents: read and write** を付与してください。

サイトリポジトリに通知用トークンは不要です。公開 Vault なら、サイトのワークフローの `GITHUB_TOKEN` でチェックアウトできます。private / internal の Vault では、**サイト**リポジトリに `RIEBECKITE_CONTENT_READ_TOKEN` を **Contents: read** で登録します。

## 5. Cloudflare を設定する

**サイト**リポジトリに次を登録します。

- Secret `CLOUDFLARE_API_TOKEN`：Account の **Workers Scripts:Edit**、Zone の **Workers Routes:Edit**、Zone の **Zone:Read**
- Variable `CLOUDFLARE_ACCOUNT_ID`：Cloudflare のアカウント ID

`site.baseUrl` と `wrangler.jsonc` の `routes` も設定します。

## 6. 流れを確認する

```sh
cd my-site
npm exec riebeckite check
npm exec riebeckite build
```

サイトリポジトリを push し、その後 Vault に Markdown の変更を push します。次を確認します。

1. Vault リポジトリの `notify-site.yml` が成功する。
2. サイトリポジトリで `repository_dispatch` の実行が始まる。
3. 公開サイトに変更が反映される。

dispatch が失敗する場合は、App がサイトリポジトリにインストールされているか、App ID と秘密鍵が正しいか、dispatch を作成する権限があるかを確認してください。

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
