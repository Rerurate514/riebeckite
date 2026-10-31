---
date: 2026-10-31
title: 公開ワークフロー
---
# 公開ワークフロー

Publication Workflow は、既存の静的ビルドの上に、公開計画、予約公開、公開前検証、承認、デプロイ診断を追加します。`push → build → deploy` という単純な経路はそのまま動作します。`riebeckite publish` を一度も実行しないサイトの挙動は変わりません。

構成は4つです。

1. **Publication Planner** — 解決済みのコンテンツマニフェストから公開計画を作る Core API。
2. **Workflow** — draft、review、approved、published、retracted の状態。承認は任意です。
3. **Hosting adapter** — Cloudflare Workers、Cloudflare Pages、GitHub Pages、Netlify、Vercel のデプロイ方法と機能差。
4. **Diagnostics** — ローカル検証、成果物の Fingerprint、公開履歴。

Riebeckite Core は GitHub や Cloudflare を直接呼びません。Adapter と履歴は CLI にあり、認証情報はデプロイするコマンドの環境変数から出ません。

## 公開計画は公開判定を二重実装しない

Planner は `ContentManifestEntry.publishing` を読みます。これは既存の `resolvePublishingState` が生成した結果です。したがって Draft、Scheduled、Unlisted、Public の判定はビルド時に一度だけ行われ、Planner はその結果を観測するだけです。`manifest.publicRedirects` も読むため、公開されていないリダイレクト先が計画や成果物に入ることはありません。

| Visibility | ルーティング | 発見可能 | Planner の分類 |
| --- | ---: | ---: | --- |
| `public` | あり | あり | public |
| `unlisted` | あり | なし | unlisted |
| `scheduled` | `publishAt` までなし | なし | scheduled |
| `draft` | なし | なし | draft |

`publishAt` は境界を含みます。`publishAt: 2026-01-10T09:00:00+09:00` のノートは `2026-01-10T00:00:00.000Z` から公開されます。端末のローカルタイムではなく、指定されたオフセットで判定されます。

## Core API

```ts
import {
  createPublicationPlan,
  publicationEntriesFromManifest,
  publicationRedirectsFromManifest,
} from "@riebeckite/core";

const plan = createPublicationPlan({
  buildTime: new Date(),
  entries: publicationEntriesFromManifest(manifest),
  redirects: publicationRedirectsFromManifest(manifest),
  previous: lastSuccessfulSnapshot,
  workflow: "direct", // または "approved"
});
```

計画は JSON にできます。内容は次のとおりです。

- `targets.public`、`targets.unlisted`、`targets.scheduled`、`targets.drafts`
- `nextPublicationAt` — 未来の `publishAt` のうち最も早いもの
- `changes` — added、changed、removed、unchanged、`detected`
- `publicationFingerprint` — 公開対象のエントリと公開リダイレクトのハッシュ
- `workflow` と `approvals.pending`
- `validation.issues`
- `action` — `none`、`build-and-deploy`、`blocked`
- `build` と `deploy` の真偽値、および `reasons`

`createPublicationSnapshot(plan, { runId })` は次回の比較に使う記録を作ります。スナップショットには公開対象のエントリ、Fingerprint、リダイレクトだけが入り、本文や認証情報は入りません。

## 予約公開

予約されたノートは `publishAt` より前はルーティング対象外としてビルドされます。時刻を過ぎると、次のビルドで public として解決されます。Planner は Fingerprint の変化を見て build と deploy を計画するため、内容を編集していない予約公開もサイトに反映されます。既存のビルド状態は `nextPublishingChangeAt` を記録しており、その時刻を過ぎると出力の再利用を停止します。

Riebeckite がスケジューラーを持たない環境では、予約はベストエフォートです。

| Host | Scheduler | 意味 |
| --- | --- | --- |
| GitHub Pages | `ci-best-effort` | GitHub Actions のスケジュールがビルドを起動する。遅延し得る。 |
| Cloudflare Workers / Pages | `none` | CI または手動で `publish run` を実行する。 |
| Netlify / Vercel | `none` | Cloudflare と同じ。 |

遅延した実行が古い内容を公開することはありません。実行時に計画を再計算します。実行が抜けた場合も、次の成功した実行で回復します。

## 承認ワークフロー

承認は任意です。個人サイトは `workflow: "direct"` を使い、追加ファイルは不要です。

レビューが必要な場合は `workflow: "approved"` を使います。

```sh
riebeckite publish approve <slug> [--all] [--by "editor"]
riebeckite publish plan --require-approval
```

承認記録はプロジェクトルートの `publication/approvals.json` に保存されます。各記録は slug と、そのノートのコンテンツ Fingerprint（slug、permalink、title、レンダリング済み HTML、リダイレクト）を結び付けます。ノートを編集すると承認は無効になります。予約ノートは、Fingerprint がスケジュール項目を含まないため、`publishAt` を迎えても再承認は不要です。

信頼できるのは、CI がチェックアウトするブランチにコミットされた承認ファイルだけです。CLI はファイルを書きますが、それ自体で信頼を付与することはなく、ファイルに秘密情報は入りません。個人サイトはこの仕組みを使わなくて構いません。チームは `publication/approvals.json` を branch protection や CODEOWNERS で保護できます。

承認状態とサイトの公開状態は分けて扱います。

- `review` — 承認待ち。デプロイしない。
- `approved` — 承認はあるが、新しい計画はまだデプロイされていない。
- `published` — 最後に成功したスナップショットが現在の計画と一致する。
- `retracted` — 以前公開されていたノートが公開対象外になった。次のデプロイで削除される。

公開取り下げと再公開は既存の Visibility に従います。`visibility: draft` にする（または `publish: true` を外す）してデプロイすれば取り下げ、再び public にしてデプロイすれば再公開です。Planner は削除・追加されたエントリを報告します。

## CLI

```text
riebeckite publish plan      [--json] [--at <iso>] [--provider <name>] [--approvals <path>] [--require-approval]
riebeckite publish status    [--json] ...
riebeckite publish validate  [--json] ...
riebeckite publish run       [--execute] [--force] [--trigger <manual|scheduled|ci|cli>] ...
riebeckite publish approve   <slug...> [--all] [--by <name>]
riebeckite publish record    --provider <name> [--trigger <manual|scheduled|ci|cli>]
```

`plan` と `status` は読み取り専用です。`validate` は計画にエラーがある場合、またはビルド成果物が計画と一致しない場合に非ゼロで終了します。`run` は `--execute` を付けるまで Dry Run です。

```sh
# ネットワークに触れずに確認する
npm exec riebeckite publish plan --json

# dist/ がこの計画の成果物か確認する
npm exec riebeckite publish validate

# 明示的にビルドしてデプロイする
npm exec riebeckite publish run --execute --provider cloudflare-workers

# CI: スケジュール起動
npm exec riebeckite publish run --execute --trigger scheduled
```

`run --execute` は計画が必要とするときだけビルドします。`.riebeckite/build-output.json` に公開用メタデータを書き、現在の計画と Fingerprint が一致しない成果物のデプロイを拒否します。別の実行が `.riebeckite/publication/lock.json` を保持している場合は停止します。プロセスが終了しているロックや1時間以上前のロックは置き換えます。`--force` は変更がない計画でもデプロイできるようにします。

`record` は外部の CI action が実行したデプロイ用です。ビルド済み成果物を現在の計画と照合し、デプロイせずに成功した実行とスナップショットを履歴に記録します。`wrangler-action` や `actions/deploy-pages` の後に実行すると、次回の実行が変更なしを検出できます。

既存の `riebeckite deploy` は変更していません。`publish run` は Cloudflare Workers のときにそれを使います。

## Hosting adapter

| Provider | Redirect | Scheduler | デプロイ経路 |
| --- | --- | --- | --- |
| `github-pages` | 静的スタブ | CI ベストエフォート | `gh workflow run` または実行中の GitHub Actions |
| `cloudflare-workers` | ネイティブ | なし | `wrangler deploy` |
| `cloudflare-pages` | ネイティブ | なし | `wrangler pages deploy` |
| `netlify` | ネイティブ | なし | `netlify deploy --prod` |
| `vercel` | ネイティブ | なし | `vercel deploy --prod` |

Provider の検出は `wrangler.jsonc|json|toml`、`.github/workflows` の Pages 用 action、`vercel.json`、`netlify.toml` を確認します。`--provider` で上書きできます。必要な環境変数の**名前**は `publish status --json` が報告しますが、値は Riebeckite が読んだり記録したり書き込んだりすることはありません。

GitHub Pages では、ビルドに deploy プラグインの `.nojekyll` と `404.html` が必要です。欠けていると `publish validate` が警告します。Adapter は Core からアップロードしません。GitHub Actions のジョブが `actions/deploy-pages` で成果物を配信し、その後 `publish record --provider github-pages` を呼びます。CI 外では `publish run --execute --provider github-pages` が `gh workflow run` でデプロイワークフローを起動します。起動はデプロイ成功を証明しないため、成功スナップショットは記録しません。ワークフロー完了後に `publish record` を実行してください。

## CI

このリポジトリの `.github/workflows/publish.yml` が動作する参考例です。

- `schedule` は15分ごと、`workflow_dispatch` は手動実行です。
- `riebeckite-publish` の concurrency group により同時実行は1つです。待機中の実行は現在の実行をキャンセルせず、後から開始されます。
- `publish plan --json` が build と deploy の要否を決めます。変更がなければどちらも行いません。
- 計画は成果物としてアップロードされ、`publish validate` がビルド出力を検査します。
- 実際のアップロードはホストの action（ここでは `cloudflare/wrangler-action`）が行います。その後 `publish record` が成功スナップショットを書き、ワークフローキャッシュが次回実行へ引き継ぎます。スナップショットがないと、新しい runner はすべてのノートを新規追加とみなします。
- GitHub Pages では `actions/upload-pages-artifact` と `actions/deploy-pages` で同じ形になります。

スケジュール実行は runner の空き状況と GitHub のキューで遅延します。ワークフローは冪等です。遅れた実行は抜けたスケジュールを再生せず、現在の状態を計算します。失敗した段階では直前の成功スナップショットが残るため、次の実行が同じ計画を再試行します。

## 履歴と診断

公開履歴は `.riebeckite/publication/history.json` に書かれます。

- run id、trigger、dry-run の別、action
- 計画と成果物の Fingerprint
- provider と workflow 状態
- build と deploy の状態、所要時間、失敗理由
- 変更概要と次回予約公開
- 最後に成功したスナップショット

履歴は50実行までで、環境変数の値やトークンを含みません。ローカルのビルド状態であり、コミットされません。長期保存したい場合は CI の成果物としてアップロードしてください。

`publish status --json` は現在の計画、成果物の状態、provider の機能、必要な環境変数名、承認ファイルのパス、履歴をまとめて出力します。ネットワークがなくても動作し、認証情報が必要なのは実際のデプロイだけです。

## 検証状況

ローカルの計画、承認、成果物、adapter、履歴の検査はパッケージのテストで実行されます。Cloudflare Workers、Cloudflare Pages、GitHub Pages、Netlify、Vercel への実際のアップロードには認証情報が必要で、このリポジトリのテストでは利用できないため、自動テストでは **UNVERIFIED** です。ワークフローを信頼する前に、各 provider で信頼できる環境から `publish run --execute` を一度実行してください。

## この仕組みがしないこと

- ホスティングの認証情報を Core、マニフェスト、静的出力に埋め込まない。
- Core にデータベース、サーバー、スケジューラーを追加しない。
- 2つ目の公開判定を導入しない。既存の frontmatter と `PublishStrategy` が引き続き唯一の判定です。
- `publish` を使わないサイトの挙動を変えない。
