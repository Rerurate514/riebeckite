---
date: 2026-10-31
title: 公開ワークフロー
---
# 公開ワークフロー

Publication Workflow は、既存の[[build-system|静的ビルド]]に公開計画、予約公開、公開前検証、承認、デプロイ診断を追加します。従来の `push → build → deploy` という単純な経路もそのまま使えます。`riebeckite publish` を一度も実行しないサイトの挙動は変わりません。

仕組みは次の4つです。

1. **Publication Planner**：解決済みの[[glossary/manifest|コンテンツマニフェスト]]から公開計画を作る Core API。
2. **Workflow**：[[glossary/draft|draft]]、review、approved、published、retracted の状態。承認は任意です。
3. **Hosting adapter**：[[guides/deployment/cloudflare-workers|Cloudflare Workers]]、Cloudflare Pages、GitHub Pages、Netlify、Vercel のデプロイ方法と機能差。
4. **Diagnostics**：ローカル検証、成果物の[[glossary/fingerprint|Fingerprint]]、公開履歴。

Riebeckite Core は GitHub や Cloudflare を直接呼びません。アダプターと履歴は [[reference/cli|CLI]] にあり、認証情報はデプロイするコマンドの環境変数の中にとどまります。

## 公開計画は公開判定を二重実装しない

Planner は `ContentManifestEntry.publishing` を読みます。これは既存の `resolvePublishingState` が生成した結果です。そのため [[glossary/draft|Draft]]、Scheduled、[[glossary/unlisted|Unlisted]]、Public の判定はビルド時に一度だけ行われ、Planner はその結果を参照するだけです。`manifest.publicRedirects` も読むので、公開されていないリダイレクト先が計画や成果物に入ることはありません。

| Visibility | ルーティング | 発見可能 | Planner の分類 |
| --- | ---: | ---: | --- |
| `public` | あり | あり | public |
| `unlisted` | あり | なし | unlisted |
| `scheduled` | `publishAt` までなし | なし | scheduled |
| `draft` | なし | なし | draft |

`publishAt` はその時刻を含みます。`publishAt: 2026-01-10T09:00:00+09:00` のノートは `2026-01-10T00:00:00.000Z` から公開されます。判定には端末のローカルタイムではなく、指定されたオフセットを使います。

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

計画は JSON にシリアライズできます。内容は次のとおりです。

- `targets.public`、`targets.unlisted`、`targets.scheduled`、`targets.drafts`
- `nextPublicationAt` — 未来の `publishAt` のうち最も早いもの
- `changes` — added、changed、removed、unchanged、`detected`
- `publicationFingerprint` — 公開対象のエントリ、公開リダイレクト、[[glossary/generated-output|生成出力]]（[[derived-data|Derived View]] を含む）のハッシュ
- `workflow` と `approvals.pending`
- `validation.issues`
- `action` — `none`、`build-and-deploy`、`blocked`
- `build` と `deploy` の真偽値、および `reasons`

`createPublicationSnapshot(plan, { runId })` は、次回の比較に使う記録を作ります。スナップショットに入るのは公開対象のエントリ、Fingerprint、[[glossary/redirect|リダイレクト]]だけです。本文や認証情報は入りません。

## 予約公開

予約されたノートは、`publishAt` より前はルーティング対象外としてビルドされます。時刻を過ぎると、次のビルドで public として解決されます。内容を編集していない予約公開も、Fingerprint の変化から Planner が build と deploy を計画するため、サイトに反映されます。既存の[[glossary/build-state|ビルド状態]]は `nextPublishingChangeAt` を記録しており、その時刻を過ぎると[[glossary/output-cache|出力の再利用]]を停止します。

Riebeckite がスケジューラーを持たない環境では、予約公開はベストエフォートで動作します。

| Host | Scheduler | 意味 |
| --- | --- | --- |
| GitHub Pages | `ci-best-effort` | [[guides/deployment/github-actions|GitHub Actions]] のスケジュールがビルドを起動する。遅延し得る。 |
| Cloudflare Workers / Pages | `none` | CI または手動で `publish run` を実行する。 |
| Netlify / Vercel | `none` | Cloudflare と同じ。 |

遅延した実行が古い内容を公開することはありません。計画は実行時に再計算されます。実行が抜けても、次の成功した実行で回復します。

## 承認ワークフロー

承認は任意です。既定では、承認手続きのない単一の公開モデルを使います。

```ts
export default defineConfig({
  site: { title: "My notes" },
});
```

計画、成果物、永続状態の検査は常に実行されます。承認を追加する場合は、その上で次のように設定します。

```ts
publication: {
  requireApproval: true,
  approvalFile: "publication/approvals.json", // 任意
},
```

共通ゲート（`riebeckite publish gate`）は、publish ワークフロー、`publish run`、Cloudflare のセットアップ補助で実行されます。`wrangler` を直接呼ぶ経路は Riebeckite の管理外なので、ワークフローファイルとリポジトリ設定も保護してください。

レビューが必要な場合は設定の `requireApproval: true`、Core API の `workflow: "approved"`、または CLI の `--require-approval` を使います。

```sh
riebeckite publish approve <slug> [--all] [--by "editor"]
riebeckite publish revoke <slug> [--all]
riebeckite publish plan --require-approval
```

承認記録はプロジェクトルートの `publication/approvals.json` に保存されます。各記録は [[glossary/slug|slug]] と、そのノートのコンテンツ Fingerprint を結び付けます。Fingerprint には slug、[[glossary/permalink|permalink]]、title、レンダリング済み HTML、リダイレクトが含まれます。ノートを編集すると承認は無効になります。予約ノートの Fingerprint はスケジュール項目を含まないため、`publishAt` を迎えても再承認は不要です。

信頼できるのは、CI がチェックアウトするブランチにコミットされた承認ファイルだけです。CLI はファイルを書き出しますが、書き出したこと自体で信頼が生まれるわけではありません。ファイルに秘密情報は入りません。個人サイトではこの仕組みを使わなくても構いません。チームは `publication/approvals.json` を branch protection や CODEOWNERS で保護できます。`publish revoke` で記録を削除すると、次の計画は `review` に戻ります。

承認状態とサイトの公開状態は別々に管理します。

- `review` — 承認待ち。デプロイしない。
- `approved` — 承認はあるが、新しい計画はまだデプロイされていない。
- `published` — 最後に成功したスナップショットが現在の計画と一致する。
- `retracted` — 以前公開されていたノートが公開対象外になった。次のデプロイで削除される。

公開の取り下げと再公開は、既存の [[glossary/visibility|Visibility]] に従います。`visibility: draft` にして（または `publish: true` を外して）デプロイすれば取り下げ、再び public にしてデプロイすれば再公開です。Planner は削除・追加されたエントリを報告します。

## CLI

```text
riebeckite publish plan      [--json] [--at <iso>] [--provider <name>] [--approvals <path>] [--state-file <path>] [--require-approval]
riebeckite publish status    [--json] [--state-file <path>] ...
riebeckite publish validate  [--json] [--state-file <path>] ...
riebeckite publish run       [--execute] [--force] [--trigger <manual|scheduled|ci|cli>] [--state-file <path>] ...
riebeckite publish approve   <slug...> [--all] [--by <name>]
riebeckite publish revoke    <slug...> [--all]
riebeckite publish record    --provider <name> [--state-file <path>]
riebeckite publish gate      [--json] [--provider <name>] [--state-file <path>]
```

`plan` と `status` は読み取り専用です。`validate` は計画にエラーがある場合、またはビルド成果物が計画と一致しない場合に非ゼロで終了します。`run` は `--execute` を付けるまで Dry Run として動作します。

`--state-file <path>` または環境変数 `RIEBECKITE_PUBLICATION_STATE` は
`publication/state.json` を上書きします。永続状態をチェックアウトしたツリーの外に
置くサイト向けです。明示したパスにファイルがなければコールドスタートとなり、
明示したパスの状態が壊れていれば、黙ってリセットせずエラーになります。

```sh
# ネットワークに触れずに確認する
npm exec -- riebeckite publish plan --json

# dist/ がこの計画の成果物か確認する
npm exec -- riebeckite publish validate

# 明示的にビルドしてデプロイする
npm exec -- riebeckite publish run --execute --provider cloudflare-workers

# CI: スケジュール起動
npm exec -- riebeckite publish run --execute --trigger scheduled
```

`run --execute` は、計画が必要とするときだけビルドします。`.riebeckite/build-output.json` に公開用メタデータを書き、現在の計画と Fingerprint が一致しない成果物のデプロイを拒否します。別の実行が `.riebeckite/publication/lock.json` を保持している場合は停止します。プロセスが終了しているロックと1時間以上前のロックは置き換えます。`--force` を付けると、変更のない計画でもデプロイできます。

`record` は、外部の CI action が実行したデプロイのためのコマンドです。ビルド済み成果物を現在の計画と照合し、デプロイせずに成功した実行とスナップショットを永続状態と履歴に記録します。`wrangler-action` や `actions/deploy-pages` の後に実行します。

`gate` はデプロイ前の単一のチェックです。常に計画とビルド成果物を検証し、`requireApproval` が有効なときは現在のコンテンツが承認済みになるまで失敗します。`publish validate` も同じ規則に従います。

`riebeckite deploy` はデプロイを実行しなくなりました。代わりに `riebeckite publish run --execute` を使ってください。`deploy setup` と `deploy domain` は Cloudflare の設定補助として残ります。

## ホスティングアダプター

| Provider | Redirect | Scheduler | デプロイ経路 |
| --- | --- | --- | --- |
| `github-pages` | 静的スタブ | CI ベストエフォート | publish ワークフロー内の `actions/deploy-pages` |
| `cloudflare-workers` | ネイティブ | なし | `wrangler deploy` |
| `cloudflare-pages` | ネイティブ | なし | `wrangler pages deploy` |
| `netlify` | ネイティブ | なし | `netlify deploy --prod` |
| `vercel` | ネイティブ | なし | `vercel deploy --prod` |

プロバイダーの検出では、`wrangler.jsonc|json|toml`、`.github/workflows` の Pages 用 action、`vercel.json`、`netlify.toml` を確認します。`--provider` で検出結果を上書きできます。必要な環境変数の**名前**は `publish status --json` が報告します。値は読み取りも記録も書き込みも行いません。

GitHub Pages では、ビルドに [[plugins/deploy|deploy プラグイン]]の `.nojekyll` と `404.html` が必要です。欠けていると `publish validate` が警告します。アダプターは Core からアップロードせず、CLI も検証できないワークフローを起動しません。publish ワークフローは `publish gate --provider github-pages` を実行し、`actions/deploy-pages` で配信した後、`publish record --provider github-pages` を呼びます。

## CI

このリポジトリの `.github/workflows/publish.yml` が唯一の本番デプロイ経路です。

- `push`（main）、`schedule`、`workflow_dispatch` がすべて同じ経路に入ります。
- `riebeckite-production` concurrency group により、同時に実行できるデプロイは1つだけです。実行中のデプロイはキャンセルしません。
- ワークフローはブランチの先頭を取得し、チェックアウトしたコミットが古い場合は停止します。待機していた実行が古い内容で新しいデプロイを上書きすることはありません。
- `publish plan --json` がスケジュール実行の build/deploy 要否を決めます。push はアプリケーションコードが変わり得るため常にビルドします。
- 計画は成果物としてアップロードされ、`publish validate` と `publish gate` がビルド出力を検査します。
- 実際のアップロードはホストの action（ここでは `cloudflare/wrangler-action`）が行います。その後 `publish record` が成功スナップショットをワークツリー外の `RIEBECKITE_PUBLICATION_STATE` に書き、ワークフローが Git plumbing で `publication-state` ブランチに保存します。ソースブランチへのコミットや push は行いません。
- GitHub Pages では `actions/upload-pages-artifact` と `actions/deploy-pages` で同じ形になります。

予約公開を使わないサイトでも、この参考ワークフローでは schedule が動きます。ただし計画に変更がなければ build と deploy は省略されます。定期チェック自体が不要なら、生成したサイトから `schedule` トリガーを削除してください。

公開状態は、独立した履歴を持つ専用の `publication-state` ブランチに置きます。ワークフローは計画の前に runner の一時ディレクトリへ状態を復元し、デプロイ成功後に1つのコミットだけを push します。必要な権限は `contents: write` だけで、標準の `GITHUB_TOKEN` 以外は要求しません。実行中にブランチが進んだ場合は、新しい状態を上書きせずに失敗します。サイトはすでにデプロイ済みなので、再実行すれば現在の状態を記録できます。ブランチが存在しない場合は、旧 `publication/state.json` がまだコミットされていればそれを引き継ぎ、なければ最初から公開します。状態ファイルが壊れている場合は、黙って全再デプロイせず失敗します。

### 既存の状態をソースブランチから移行する

以前の Riebeckite は `publication/state.json` をソースブランチにコミットしていました。移行手順は次のとおりです。

1. `.github/workflows/publish.yml` を現在のテンプレートに更新し、既存の `publication/state.json` は1回の実行分だけコミットしたまま残します。
2. push するか、ワークフローを手動実行します。旧ファイルを読み取り、`publication-state` ブランチを作成します。
3. 通常のコミットで `publication/state.json` をリポジトリから削除し、`.gitignore` に残します。ワークフローが開発ブランチに再生成することはありません。
4. `publication-state` を開発ブランチへマージしないでください。独立した履歴を持つ運用状態です。

最初の実行前に旧ファイルを削除した場合、その1回だけ全再デプロイになります。失われるものはなく、次の成功実行でブランチが初期化されます。復旧のためにブランチを force push しないでください。全再デプロイを受け入れる場合に限り削除するか、ブランチ自身の履歴から復元してください。

スケジュール実行は、runner の空き状況や GitHub のキューによって遅れます。ワークフローは冪等なので、遅れた実行は抜けたスケジュールを再生せず、現在の状態を計算します。再実行が古いコミットをチェックアウトした場合、ビルドマーカーがコミット済み状態より古いため、`record` は新しいスナップショットの上書きを拒否します。

## 履歴と診断

永続的な公開状態は、`publication-state` ブランチ上の `state.json` です。CI は `RIEBECKITE_PUBLICATION_STATE` を通して復元し、チェックアウトしたソースツリーには書き込みません。ローカル CLI は既定でプロジェクトルートの `publication/state.json` を使います。このファイルは Git の追跡対象外です。CI の正本はブランチだからです。`--state-file <path>` で別の場所を指定でき、明示したファイルが壊れている場合は安全側に倒して失敗します。スナップショットには最後に成功した状態だけが入り、内訳は run id、公開 Fingerprint、公開対象の slug、Fingerprint、リダイレクト、成果物 Fingerprint、provider です。本文や認証情報は含まず、変更検出の信頼できる記録になります。

`.riebeckite/publication/history.json` は診断用の履歴です。

- run id、trigger、dry-run の別、action
- 計画と成果物の Fingerprint
- provider と workflow 状態
- build と deploy の状態、所要時間、失敗理由
- 変更概要と次回予約公開
- 最後に成功したスナップショット

履歴は50実行までに制限され、環境変数の値やトークンを含みません。ローカルの[[glossary/build-state|ビルド状態]]であり、コミットもされません。GitHub Actions の[[glossary/cache|キャッシュ]]は診断を継続するために復元しますが、唯一の真実の保存先にはしません。キャッシュが失われたり切り詰められたりしても、起きるのは全再デプロイだけで、誤った公開は起きません。壊れた履歴は警告を出して無視します。

## Lock と clean

`.riebeckite/publication/lock.json` は排他的作成で作られるため、ローカルの2つの実行が同時に取得することはありません。ロックにはプロセス ID とホスト名を記録します。このホストでプロセスが生存しているロックは、経過時間や `--force` では削除されません。プロセスが終了しているロックや、ローカル状態を所有しないホストのロックは回収します。`clean --all` と `clean --state` は、実行中の公開ロックがある間は拒否されます。clean が削除するのは `.riebeckite` だけで、永続状態と承認記録は残ります。公開履歴と信頼は、クリーンビルドを越えて保持されます。

## ビルド出力マーカー

すべての [[glossary/ssg|SSG]] ビルドは、ビルド状態の隣に `.riebeckite/build-output.json` を書き出します。このファイルは出力ディレクトリ、公開 Fingerprint、完了時刻を記録します。CLI ビルドは成果物ハッシュも記録します。マーカーは内部状態であり、`dist/` には入らず、認証情報も含みません。

デプロイ前に、現在の計画と公開 Fingerprint が一致するマーカーを必須にします。CLI ビルドが成果物ハッシュを記録している場合は、`dist/` のファイルも一致しなければなりません。マーカーの欠損、破損、古い計画からコピーされたマーカーは、安全側に倒して失敗します。`publish validate` と `publish record` はマーカーの完了時刻を使うため、計画とビルドの数秒の時刻差で誤判定しません。

`publish status --json` は現在の計画、成果物の状態、provider の機能、必要な環境変数名、承認ファイル、永続状態、履歴をまとめて出力します。ネットワークがなくても動作し、認証情報が必要なのは実際のデプロイだけです。

## セキュリティと信頼境界

- Core とプランナーは、ホスティングの認証情報を読む、保存する、書き込むことを
  しません。`publish status` が報告するのは必要な環境変数の名前で、値ではありません。
- 承認が信頼されるのは、CI がチェックアウトするブランチに
  `publication/approvals.json` がコミットされている場合だけです。ローカルの
  ファイルだけでは何も許可されません。
- 承認記録に秘密情報はありません。slug を現在のコンテンツフィンガープリントに
  結び付けるため、ノートを編集すると承認は無効になります。
- デプロイには、現在の計画と公開フィンガープリントが一致するビルドマーカーが
  必要です。成果物ハッシュが記録されていれば、`dist/` のファイルも一致しなければ
  なりません。欠損したマーカーやコピーされたマーカーは安全側に倒して失敗します。
- ロックはローカルの 2 つの実行が同時にデプロイするのを防ぎます。`wrangler` の
  直接実行や別マシンとは調整しません。
- provider の直接操作や手動の `wrangler` 実行は Riebeckite の管理外です。
  ワークフローファイル、リポジトリ設定、provider の認証情報は別途保護してください。

## トラブルシューティング

- **`publish validate` が成果物の不一致で失敗する**: 現在の計画でビルドし直して
  ください。コピーした `dist/` や古いビルドマーカーはデプロイできません。
- **`publish run --execute` が永続状態の方が新しいと報告する**: 状態ファイルが
  より新しいデプロイのものです。CI では最新の `publication-state` ブランチを
  復元し、ローカルでは状態ファイルを更新してから、ビルドし直して公開してください。
- **承認が必要なのに `publish approve` で解決しない**: 承認は現在のコンテンツ
  フィンガープリントに結び付きます。新しいコンテンツでビルドし直して承認して
  ください。ノートを編集すると承認は無効になります。
- **予約したノートが公開されない**: スケジューラーはベストエフォートです。
  `publish plan` で `publishAt` を確認し、`publish run --execute` を実行するか、
  次のスケジュール実行を待ってください。
- **ローカルではゲートが通るのに CI で止まる**: CI はコミット済みの承認ファイルと
  現在の成果物を検査します。ローカルの未コミットの承認ファイルは信頼されません。
- **provider が検出されない**: `--provider` を渡し、ホスティング設定ファイルが
  あることを確認してください。認証情報を読むのはデプロイするコマンドだけです。

## 検証状況

ローカルの計画、承認、成果物、adapter、履歴の検査は、パッケージのテストで実行されます。Cloudflare Workers、Cloudflare Pages、GitHub Pages、Netlify、Vercel への実際のアップロードには認証情報が必要で、このリポジトリのテストでは利用できません。そのため、自動テストでは **UNVERIFIED** です。ワークフローを信頼する前に、各プロバイダーで信頼できる環境から `publish run --execute` を一度実行してください。

## この仕組みがしないこと

この節は制約の一覧であり、ロードマップではありません。

- ホスティングの認証情報を Core、[[glossary/manifest|マニフェスト]]、静的出力に埋め込まない。
- Core にデータベース、サーバー、スケジューラーを追加しない。
- 2つ目の公開判定を導入しない。既存の [[glossary/frontmatter|frontmatter]] と [[glossary/publish-strategy|PublishStrategy]] が引き続き唯一の判定です。
- `publish` を使わないサイトの挙動を変えない。
