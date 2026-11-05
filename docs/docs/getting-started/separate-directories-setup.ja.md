---
date: 2026-11-05
title: ディレクトリ分離型セットアップ
sidebar:
  label: ディレクトリ分離型セットアップ
  order: 23
---
# ディレクトリ分離型セットアップ

ディレクトリ分離型は、Obsidian Vault とサイト実装を1つのリポジトリ内の別フォルダに置きます。Vault は通常の Markdown フォルダのまま、`site/` が Riebeckite プロジェクトです。

公式サンプル: [Rerurate514/riebeckite-e2e-directories](https://github.com/Rerurate514/riebeckite-e2e-directories) — [directories.riebeckite.dev](https://directories.riebeckite.dev)

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

## 1. サイトを作る

リポジトリのルートで実行します。

```sh
npx create-riebeckite site --preset starter --github-actions
cd site
npm install
```

## 2. コンテンツを Vault へ移す

リポジトリのルートに `vault/` を作り、生成されたコンテンツを移動します。

```sh
mkdir ../vault
mv content/* ../vault/
rmdir content
```

Windows では Explorer または `Move-Item` で移動してください。

## 3. サイトから Vault を参照する

`site/riebeckite.config.ts` を編集します。

```ts
export default defineConfig({
  content: { directory: "../vault" },
  // ...
});
```

パスは設定ファイルがある場所を基準に解決されます。ターミナルのカレントディレクトリ基準ではありません。

## 4. Worker 名とドメインを設定する

`site/wrangler.jsonc` を編集します。

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "my-project",
  "compatibility_date": "2026-06-09",
  "compatibility_flags": ["nodejs_compat"],
  "assets": { "directory": "./dist" },
  "routes": [{ "pattern": "my-project.example.com", "custom_domain": true }]
}
```

編集するときも `compatibility_flags` と `assets` は残してください。assets のみの Worker には必要です。

`site.baseUrl` を `https://my-project.example.com` にし、`site.title` も設定します。

## 5. ローカルで動かす

```sh
cd site
npm exec riebeckite check
npm exec riebeckite dev
```

## 6. ワークフローを設定する

生成された `site/.github/workflows/publish.yml` は、プロジェクトルートがリポジトリルートにある前提です。リポジトリルートへ移動し、次を設定します。

- `push.paths` に `site/**`、`vault/**`、ワークフローファイルを追加する。
- すべての run ステップに `defaults.run.working-directory: site` を設定する。
- `actions/setup-node` の `cache-dependency-path` を `site/package-lock.json` にする。
- `cloudflare/wrangler-action` に `workingDirectory: site` を設定する。
- ビルド状態を保存するキャッシュパスを `site/` 始まりにする。

`package-lock.json` は `site/` に置きます。完全なファイルはサンプルを参照してください。

<https://github.com/Rerurate514/riebeckite-e2e-directories/blob/main/.github/workflows/publish.yml>

## 7. デプロイする

リポジトリの Secret に `CLOUDFLARE_API_TOKEN`、Variable に `CLOUDFLARE_ACCOUNT_ID` を登録し、`main` へ push します。ワークフローは `site/` でビルドし、Worker をデプロイします。

## よくある間違い

- リポジトリルートで `npm` コマンドを実行する。`site/` で実行してください。
- `../vault` ではなく `vault` を指定する。パスは `site/` 基準です。
- ワークフローを `site/.github/` に置いたままにする。GitHub が読むのはリポジトリルートの `.github/workflows/` だけです。
- `push.paths` に `vault/**` を入れ忘れ、コンテンツ更新でデプロイされない。

## 次に読む

- [リポジトリ分離型セットアップ](./separate-repositories-setup.ja.md)
- [GitHub Actions](../guides/deployment/github-actions.ja.md)
- [公開ワークフロー](../guides/deployment/publication-workflow.ja.md)
