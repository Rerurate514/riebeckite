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

承認は任意です。個人サイトは既定のままで追加ファイルは不要です。

```ts
export default defineConfig({
  site: { title: "My notes" },
  publication: { mode: "direct" },
});
```

すべてのデプロイ経路（通常の push ワークフローを含む）で承認を必須にするには、次のように設定します。

```ts
publication: {
  mode: "managed",
  approvalFile: "publication/approvals.json", // 任意
},
```

managed モードでは共通ゲート（`riebeckite publish gate`）が `deploy.yml`、`publish.yml`、`publish run`、`riebeckite deploy` で実行されます。`wrangler` を直接呼ぶ経路は Riebeckite の管理外なので、ワークフローファイルとリポジトリ設定も保護してください。

レビューが必要な場合は Core API の `workflow: "approved"` または CLI の `--require-approval` を使います。

```sh
riebeckite publish approve <slug> [--all] [--by "editor"]
riebeckite publish revoke <slug> [--all]
riebeckite publish plan --require-approval
```

承認記録はプロジェクトルートの `publication/approvals.json` に保存されます。各記録は slug と、そのノートのコンテンツ Fingerprint（slug、permalink、title、レンダリング済み HTML、リダイレクト）を結び付けます。ノートを編集すると承認は無効になります。予約ノートは、Fingerprint がスケジュール項目を含まないため、`publishAt` を迎えても再承認は不要です。

信頼できるのは、CI がチェックアウトするブランチにコミットされた承認ファイルだけです。CLI はファイルを書きますが、それ自体で信頼を付与することはなく、ファイルに秘密情報は入りません。個人サイトはこの仕組みを使わなくて構いません。チームは `publication/approvals.json` を branch protection や CODEOWNERS で保護できます。`publish revoke` は記録を削除し、次の計画は `review` に戻ります。

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
riebeckite publish revoke    <slug...> [--all]
riebeckite publish record    --provider <name> [--trigger <manual|scheduled|ci|cli>]
riebeckite publish gate      [--json] [--provider <name>]
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

`record` は外部の CI action が実行したデプロイ用です。ビルド済み成果物を現在の計画と照合し、デプロイせずに成功した実行とスナップショットを永続状態と履歴に記録します。`wrangler-action` や `actions/deploy-pages` の後に実行します。

`gate` は共通のデプロイ前チェックです。direct モードではコンテンツを読まずに成功するため、既存サイトの挙動は変わりません。managed モードでは、現在のコンテンツが承認済みで、ビルド成果物が計画と一致しなければ失敗します。`publish validate` も承認待ちで計画がブロックされている場合は失敗します。

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
- `deploy.yml` と `publish.yml` は `riebeckite-production` concurrency group を共有するため、2つのワークフローが同時にデプロイすることはありません。実行中のデプロイはキャンセルしません。
- 両ワークフローはブランチの先頭を取得し、チェックアウトしたコミットが古い場合は停止します。待機していた実行が古い内容で新しいデプロイを上書きすることはありません。
- `publish plan --json` が build と deploy の要否を決めます。変更がなければどちらも行いません。
- 計画は成果物としてアップロードされ、`publish validate` と managed モードの公開ゲートがビルド出力を検査します。
- 実際のアップロードはホストの action（ここでは `cloudflare/wrangler-action`）が行います。その後 `publish record` が成功スナップショットを書き、ワークフローが `publication/state.json` を `[skip ci]` 付きでコミットします。次回実行はキャッシュではなくこのコミット済み状態を読みます。
- GitHub Pages では `actions/upload-pages-artifact` と `actions/deploy-pages` で同じ形になります。

状態のコミットには `contents: write` と、ワークフローが push できるブランチが必要です。branch protection で push が拒否された場合、デプロイ自体は行われ、ジョブは失敗を報告し、永続スナップショットが更新されないため次回実行が安全に再デプロイします。永続状態がない runner はすべてのノートを新規追加とみなします。これは全再デプロイであり、公開の取りこぼしではありません。

スケジュール実行は runner の空き状況と GitHub のキューで遅延します。ワークフローは冪等です。遅れた実行は抜けたスケジュールを再生せず、現在の状態を計算します。再実行が古いコミットをチェックアウトした場合、ビルドマーカーがコミット済み状態より古いため、`record` は新しいスナップショットの上書きを拒否します。

## 履歴と診断

永続的な公開状態はプロジェクトルートの `publication/state.json` です。最後に成功したスナップショットだけを含みます（run id、公開 Fingerprint、公開対象の slug、Fingerprint、リダイレクト、成果物 Fingerprint、provider）。サイトと一緒にコミットしてください。本文や認証情報は含まず、変更検出の信頼できる記録です。

`.riebeckite/publication/history.json` は診断用の履歴です。

- run id、trigger、dry-run の別、action
- 計画と成果物の Fingerprint
- provider と workflow 状態
- build と deploy の状態、所要時間、失敗理由
- 変更概要と次回予約公開
- 最後に成功したスナップショット

履歴は50実行までで、環境変数の値やトークンを含みません。ローカルのビルド状態であり、コミットされません。GitHub Actions のキャッシュは診断を継続するために復元しますが、唯一の真実の保存先にはしません。キャッシュの消失や切り詰めは全再デプロイを招くだけで、誤った公開は起きません。壊れた履歴は警告を出して無視します。

## Lock と clean

`.riebeckite/publication/lock.json` は排他的作成で作られるため、ローカルの2つの実行が同時に取得することはありません。ロックにはプロセス ID とホスト名を記録します。プロセスが終了しているか、1時間以上前のロックは古いとみなします。実行中のロックを `--force` が削除することはありません。

`clean --all` と `clean --state` は、実行中の公開ロックがある間は拒否します。clean が削除するのは `.riebeckite` だけで、永続状態と承認記録は残ります。公開履歴と信頼はクリーンビルドを越えて保持されます。異常終了した実行は、次回実行またはロックが古くなった後の `clean` で復旧できます。

## Build Output Marker

すべての SSG ビルドは、ビルド状態の隣に `.riebeckite/build-output.json` を書き出します。出力ディレクトリ、公開 Fingerprint、完了時刻を記録します。CLI ビルドは成果物ハッシュも記録します。マーカーは内部状態であり、`dist/` には入らず、認証情報も含みません。

デプロイ前に、現在の計画と公開 Fingerprint が一致するマーカーを必須にします。CLI ビルドが成果物ハッシュを記録している場合は、`dist/` のファイルも一致しなければなりません。マーカーの欠損、破損、古い計画からコピーされたマーカーは安全側で失敗します。`publish validate` と `publish record` はマーカーの完了時刻を使うため、計画とビルドの数秒の時刻差で誤判定しません。

`publish status --json` は現在の計画、成果物の状態、provider の機能、必要な環境変数名、承認ファイル、永続状態、履歴をまとめて出力します。ネットワークがなくても動作し、認証情報が必要なのは実際のデプロイだけです。

## 検証状況

ローカルの計画、承認、成果物、adapter、履歴の検査はパッケージのテストで実行されます。Cloudflare Workers、Cloudflare Pages、GitHub Pages、Netlify、Vercel への実際のアップロードには認証情報が必要で、このリポジトリのテストでは利用できないため、自動テストでは **UNVERIFIED** です。ワークフローを信頼する前に、各 provider で信頼できる環境から `publish run --execute` を一度実行してください。

## この仕組みがしないこと

- ホスティングの認証情報を Core、マニフェスト、静的出力に埋め込まない。
- Core にデータベース、サーバー、スケジューラーを追加しない。
- 2つ目の公開判定を導入しない。既存の frontmatter と `PublishStrategy` が引き続き唯一の判定です。
- `publish` を使わないサイトの挙動を変えない。
