---
date: 2026-10-08
title: 公開
sidebar:
  label: 公開
  order: 40
---
# 公開

## `publish`

`publish` は、`build` と `deploy` を変えずに、公開計画、予約公開、承認、成果物検証、デプロイ診断を追加します。

```sh
npm exec -- riebeckite publish plan --json
npm exec -- riebeckite publish status
npm exec -- riebeckite publish validate
npm exec -- riebeckite publish run --execute --provider cloudflare-workers
npm exec -- riebeckite publish approve <slug> --all
```

`plan` と `status` は読み取り専用です。`validate` は計画にエラーがある場合、承認待ちの場合、またはビルド成果物が計画と一致しない場合に非ゼロで終了します。`run` は `--execute` がない限りビルドもデプロイも行いません。`--execute` を使用すると、Cloudflare Workers などのホストングアダプタが CLI でデプロイされます。GitHub Pages は独自のワークフロー（`deploy({ provider: "github-pages" })`）によってデプロイする必要があります。`publish run` ではデプロイできません。`record` は外部 CI のデプロイを再デプロイせずに記録します。`gate` は単一のデプロイ前チェックで、常に計画と成果物を検証し、`publication.requireApproval` が有効なときに承認を要求します。`--require-approval` または設定で承認を任意に有効化でき、記録は `publication/approvals.json` に保存されます。デプロイ対象ブランチにコミットされたファイルだけが信頼されます。承認ストレージは `publication.approvalFile` で設定可能で、 `publication/approvals.json` は既定値です。`--state-file <path>`（または `RIEBECKITE_PUBLICATION_STATE`）は、CI と同じく永続状態ファイルをプロジェクト外に置きます。明示したファイルが壊れている場合は、黙って最初からやり直さずエラーになります。予約公開、Hosting adapter、履歴、CI については [公開ワークフロー](../../guides/deployment/publication-workflow.ja.md) を参照してください。

## `deploy setup`、`deploy workflow`、`deploy domain`

`deploy setup` と `deploy workflow` は設定を準備します。`deploy domain` は Custom Domain を追加し、確認後に `wrangler deploy` を実行できます。`deploy` は公開状態や履歴を記録しません。通常の公開フローには `riebeckite publish run --execute` を使います。

### `deploy setup`

`deploy setup` は、すでに Git リポジトリになっており、Local-first で公開しているプロジェクトに、GitHub Actions への継続的デプロイを用意します。

```sh id="k4n8ws"
npm exec riebeckite deploy setup
```

Git リポジトリと GitHub のリモートを検出し、GitHub CLI（`gh`）と Wrangler のログインを確認します。`create-riebeckite` と同じテンプレートから `.github/workflows/publish.yml` を作成し、Wrangler のログイン情報から Cloudflare アカウントを読み取ります（複数ある場合は選択を求めます）。そして、`CLOUDFLARE_ACCOUNT_ID` と `CLOUDFLARE_API_TOKEN` をリポジトリのシークレットとして登録します。トークンは非表示のプロンプト、または環境変数 `CLOUDFLARE_API_TOKEN` から読み取られ、標準入力経由で `gh secret set` に渡されます。コマンドの引数として渡されたり、ディスクに書き込まれたりすることはありません。コマンドは GitHub リポジトリを作成せず、push もしません。Riebeckite 以外のワークフローが既にある場合は、その旨を報告して変更せず、シークレットを登録する前に停止します。Wrangler はサイトにインストールされている必要があります（Local-first のサイトにはすでに含まれています）。いつでも再実行できます。一致するワークフローと既存のシークレットは検出されてスキップされるため、残りの手順だけが実行されます。別のデプロイワークフローがすでにある場合は、`deploy setup` を再度実行する前に置き換えるか削除してください。

### `deploy workflow`

`deploy workflow` は `publication.schedule` を `.github/workflows/publish.yml` に反映します。

```sh
npm exec riebeckite deploy workflow
```

ワークフローがない場合は作成します。既にある場合は `schedule` トリガーだけを変更し、外部コンテンツのチェックアウトを含む他の部分は保持します。Riebeckite のワークフローに見えないファイルは変更しません。`--check` は差分がある場合に書き込まず非ゼロで終了します。

### `deploy domain`

`deploy domain` は、`publish run` が使用する Worker に Cloudflare Workers の Custom Domain を設定します。

```sh id="d0main"
npm exec riebeckite deploy domain
```

最初の publish run の後に実行してください。これは、サイト内の既存の Wrangler 設定（`wrangler.jsonc` または `wrangler.json`）を読み取り、`custom_domain: true` を持つ宣言的な `routes` エントリを追加するためです。引数はありません。コマンドは `docs.example.com` のようなホスト名の入力を求め、変更予定の内容を表示して、書き込み前に確認を取ります。`wrangler.toml` は変更しません。Wrangler 設定が存在しない場合や、ターミナルが対話的でない場合は、ヒントを表示して停止します。書き込み後は `Deploy now?` を提示し、選ばなかった場合は `npm exec -- riebeckite publish run --execute` コマンドを表示します。再実行すると、設定済みのドメインを検出して書き込みをスキップします。
