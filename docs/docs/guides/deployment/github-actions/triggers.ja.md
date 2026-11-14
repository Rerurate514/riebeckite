---
date: 2026-10-08
title: トリガー
sidebar.label: トリガー
sidebar.order: 20
---
# トリガー

## サイトとコンテンツが同じリポジトリにある場合

これが最も単純な構成です。

```text id="8tqoq6"
my-site/
├─ content/
├─ app/
├─ riebeckite.config.ts
└─ .github/
   └─ workflows/
      └─ publish.yml
```

記事とサイトが同じリポジトリにあるため、流れは次のようになります。

```mermaid id="j89zya"
flowchart LR
    Push["main へプッシュ"]
    Workflow["publish.yml"]
    Build["ビルド"]
    Deploy["Cloudflare"]

    Push --> Workflow
    Workflow --> Build
    Build --> Deploy
```

記事を変更して `main` へプッシュすれば、そのプッシュ自体がワークフローを起動します。

## サイトとコンテンツが別リポジトリにある場合

コンテンツリポジトリを分離している場合は、流れが少し変わります。

```text id="w3jwej"
コンテンツリポジトリ
  → Markdown / Obsidian Vault

サイトリポジトリ
  → Riebeckite / 設定 / テーマ / プラグイン
```

コンテンツリポジトリへプッシュしても、**それだけではサイトリポジトリのワークフローは起動しません**。GitHub Actions のワークフローは、それぞれのリポジトリに属しているからです。

```mermaid id="v20ejj"
flowchart LR
    Content["コンテンツリポジトリ"]
    Site["サイトリポジトリ"]
    Workflow["サイトの publish.yml"]

    Content -.->|"プッシュだけでは起動しない"| Workflow
    Site -->|"プッシュ"| Workflow
```

コンテンツの更新をきっかけにサイトを自動デプロイするには、コンテンツリポジトリからサイトリポジトリへ通知します。

## `repository_dispatch`

別リポジトリからサイトのワークフローを起動するには、`repository_dispatch` を利用します。

Riebeckite が生成するワークフローは、次のイベントを受け取れるように設定されています。

```text id="5ss0v6"
content-updated
```

全体の流れは次のとおりです。

```mermaid id="k5hvll"
flowchart LR
    Push["コンテンツの<br/>main へプッシュ"]
    Notify["notify-site.yml"]
    Dispatch["repository_dispatch<br/>content-updated"]
    Site["サイトリポジトリ"]
    Workflow["publish.yml"]
    Build["ビルド"]
    Deploy["Cloudflare"]

    Push --> Notify
    Notify --> Dispatch
    Dispatch --> Site
    Site --> Workflow
    Workflow --> Build
    Build --> Deploy
```

## `notify-site.yml`

コンテンツリポジトリ側には、次のファイルを置きます。

```text id="7p33l5"
.github/workflows/notify-site.yml
```

このワークフローの役割は、サイトをビルドすることではありません。コンテンツが更新されたことをサイトリポジトリへ通知することです。

```text id="kw1g8g"
コンテンツリポジトリ
      ↓
サイトリポジトリへ
「コンテンツが更新された」と通知
```

通知を受け取ったサイトリポジトリの `publish.yml` が、ビルドとデプロイを実行します。

## GitHub App 認証

生成された `notify-site.yml` は GitHub App を優先します。自分のアカウント所有の App を作成し、Webhook を無効にし、**Contents: read and write** と **Metadata: read-only** を付与して、サイトリポジトリだけにインストールします。コンテンツリポジトリに次の Secret を設定します。

```text
RIEBECKITE_APP_ID
RIEBECKITE_APP_PRIVATE_KEY
```

ワークフローは `actions/create-github-app-token` で短期トークンを発行します。長期トークンは保存しません。

### PAT フォールバック

GitHub App を使えない場合は、コンテンツリポジトリに次の Secret を設定します。

```text
SITE_DISPATCH_TOKEN
```

サイトリポジトリだけに限定した Fine-grained PAT には **Contents: read and write** を付与します。

```mermaid
flowchart LR
    Content["コンテンツリポジトリ"]
    Token["GitHub App トークン<br/>または SITE_DISPATCH_TOKEN"]
    Site["サイトリポジトリ"]

    Content --> Token
    Token -->|"content-updated"| Site
```

このトークンは、**コンテンツリポジトリからサイトリポジトリのワークフローを起動するためのもの**です。
