# @riebeckite/cli

Riebeckite のコマンドラインインターフェースです。プロジェクトの検証・診断・状態の確認・ビルドを行う、Node.js のビルド時ツールを提供します。

[English](./README.md)

## 概要

`@riebeckite/cli` は `riebeckite` バイナリを提供します。カレントディレクトリからアプリケーションルートを解決し、コマンドの失敗は非ゼロの終了コードで安全に報告します。`check`、`doctor`、`inspect` は読み取り専用です。`profile` はトレース付きでビルドを実行し、Build 出力を書き込みます。`build` は出力を書き込み、`dev` はサーバーを起動し、`clean` は Riebeckite が管理する状態や Build 出力を削除します。

## インストール

```sh
pnpm add -D @riebeckite/cli
```

このパッケージはバイナリ（`bin/riebeckite.mjs`）のみを公開し、ライブラリのエントリポイントは持ちません。

```sh
npx @riebeckite/cli check
```

pnpm のプロジェクトでは `pnpm exec riebeckite` で実行します。

## 使い方

```text
riebeckite init [directory] [--preset <name>] [--features <names>] [--utilities <names>] [--force] [--list-presets] [--github-actions | --cloudflare-workers] [--content-repository <owner/repo>] [--site-repository <owner/repo>]
riebeckite create site [create-riebeckite options]
riebeckite create plugin [name] [options]
riebeckite create theme [name] [options]
riebeckite create page-type [name] [options]
riebeckite create component [name] [options]
riebeckite theme preview <name> [--port <port>] [--no-open]
riebeckite plugin dev <path> [--port <port>] [--no-open]
riebeckite plugin verify <path> [--level basic | integration | full] [--json]
riebeckite bridge approve <plan>
riebeckite dev
riebeckite check
riebeckite doctor [--explain | --json | --fix [--dry-run]] [--fail-on <error|warning|info>] [--code <code> ...]
riebeckite upgrade --to <version|latest> [--check] [--json]
riebeckite build [--full]
riebeckite clean [--output | --all]
riebeckite deploy setup | deploy workflow [--check] | deploy domain
riebeckite publish plan | status | validate | approve <slug...> [--all] [--by <name>] | revoke <slug...> [--all] [--by <name>] | record [--provider <name>] [--trigger <manual|scheduled|ci|cli>] | gate [--provider <name>]
riebeckite publish run [--execute] [--force] [--trigger <manual|scheduled|ci|cli>] [--provider <name>]
riebeckite content create | edit | delete | move ... [--apply] [--json]
riebeckite content plan create | edit | delete | move ... [--out <name>] [--json]
riebeckite content apply <plan> --apply [--json]
riebeckite content recover <journal> --apply [--json]
riebeckite migrate list | plan [--id <migration>] [--out <path>] | apply [--plan <path>] [--id <migration>] [--apply] | status | history [--limit <n>] | rollback <planId | migrationId> --apply | recover [--journal <path>] --apply [--json]
riebeckite profile [--full]
riebeckite inspect [config | plugins | content [--list] [--path <path-or-permalink>] | graph | build | assets [--list] [--json] | provenance | api [--deprecated] [--json]]
riebeckite help [command...]
riebeckite completion <bash | zsh | powershell> [--project]
```

## コマンド

| コマンド | 目的 | ビルド状態を書くか |
| --- | --- | --- |
| `init` | プリセットから自己完結したサイトを生成する | いいえ |
| `create` | サイト、Plugin、Theme、PageType、Component のジェネレーターを実行する | ジェネレーターによる |
| `theme preview` | ローカルの Theme を隔離された HonoX 環境でプレビューする | 一時ファイルのみ |
| `plugin dev` | ローカルの Plugin を隔離された HonoX 環境でプレビューする | 一時ファイルのみ |
| `plugin verify` | サイトに追加する前に、配布可能な Plugin を検査する | いいえ |
| `dev` | integration の開発ワークフローを起動する | integration による |
| `check` | アプリの設定、Plugin、capability の解決を検証する | いいえ |
| `doctor` | environment、設定、Plugin、content、output、Theme の共通診断を報告する | いいえ |
| `upgrade` | Riebeckite パッケージを更新する前に、隔離した baseline と候補版のビルドを比較する | いいえ |
| `build` | ビルドを実行する。`--full` は差分の再利用を行わない | 書く。出力描画前にコミットするため、その後の失敗で新しい状態が残ることがある |
| `clean` | 管理対象の状態（`.riebeckite/`）を削除する。`--output` は Build 出力のみ、`--all` は両方を削除する | いいえ |
| `deploy` | Cloudflare のワークフローとドメイン設定を用意する。`deploy domain` は確認後にアップロードできる | いいえ |
| `publish` | 公開の計画、状態確認、検証、承認、明示的な実行を行う | 実行を伴うビルドの後で書く |
| `content` | 明示的なコンテンツ変更を計画し、ジャーナル付きで書き込む | いいえ |
| `migrate` | バージョン付きのコンテンツ移行を計画・適用し、状態確認、ロールバック、リカバリーを行う | いいえ |
| `profile` | トレースに基づく性能レポートを実行する。`--full` は全体を対象にする | ビルドの実行による |
| `inspect` | 解決済みの状態を事実として表示する（`config`、`plugins`、`content`、`graph`、`build`、`assets`、`provenance`、`api`） | いいえ |

`doctor` は独立したチェックを可能な限り続行し、ヘルスチェックに失敗すると非ゼロで終了します。`inspect` は読み取り専用で、ビルドの実行や状態の書き込みは行いません。出力の読み方は [Diagnostics](../../docs/docs/framework/diagnostics.ja.md) と [Framework Inspector](../../docs/docs/framework/inspector.ja.md) を参照してください。

`doctor --explain` は各診断の fingerprint、原因、詳細、修正方法を表示します。`--code` は繰り返して診断を絞り込め、`--fail-on` では info・warning・error のどこから失敗にするかを指定できます。`--fix --dry-run` は対応済みの安全な修正があるかだけを表示します。現在、自動修正は提供していません。

`clean` は Riebeckite が管理する成果物だけを削除します。option なしでは managed state root（`.riebeckite/`）、`--output` では Build 出力、`--all` では両方を削除します。対象が存在しなくてもエラーにならないため、script や CI から安全に実行できます。cold build を行う場合は `clean --all` の後に `build` を実行します（cache directory を別の場所に設定している場合、その場所は削除対象に含まれません）。

`create theme` は分離されたローカル Theme を `themes/<name>/` に生成します。`--list` でテンプレートを確認し、`--features` で公開 Hook の追加スタイルを選択できます。`--register` は認識できる Theme factory だけを安全にサイト設定へ登録します。詳しくは [Theme Generator](../../docs/docs/themes/generator.ja.md) を参照してください。

## 典型的な流れ

```sh
pnpm exec riebeckite check
pnpm exec riebeckite doctor
pnpm exec riebeckite inspect plugins
pnpm exec riebeckite build
```

## 関連資料

- [CLI Reference](../../docs/docs/reference/cli.ja.md)
- [Build System](../../docs/docs/framework/build-system.ja.md)
- [Diagnostics](../../docs/docs/framework/diagnostics.ja.md) / [Framework Inspector](../../docs/docs/framework/inspector.ja.md)
