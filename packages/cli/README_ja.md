# @riebeckite/cli

Riebeckite のコマンドラインインターフェースです。プロジェクトの検証・診断・状態の確認・ビルドを行う、Node.js のビルド時ツールを提供します。

[English](./README.md)

## 概要

`@riebeckite/cli` は `riebeckite` バイナリを提供します。カレントディレクトリからアプリケーションルートを解決し、コマンドの失敗は非ゼロの終了コードで安全に報告します。`check`、`doctor`、`inspect`、`profile` は読み取り専用です。出力を書き換えたりサーバーを起動するのは `build` と `dev`、Riebeckite が管理する状態や Build 出力を削除するのは `clean` です。

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
riebeckite dev
riebeckite check
riebeckite doctor
riebeckite build [--full]
riebeckite clean [--output | --all]
riebeckite profile [--full]
riebeckite inspect [config | plugins | content [--list] | graph | build]
```

## コマンド

| コマンド | 目的 | ビルド状態を書くか |
| --- | --- | --- |
| `dev` | integration の開発ワークフローを起動する | integration による |
| `check` | アプリの設定、Plugin、capability の解決を検証する | いいえ |
| `doctor` | 環境、設定、Plugin、コンテンツ、診断、ビルド状態を診断する | いいえ |
| `build` | ビルドを実行する。`--full` は差分の再利用を行わない | 成功時に書く |
| `clean` | 管理対象の状態（`.riebeckite/`）を削除する。`--output` は Build 出力のみ、`--all` は両方を削除する | いいえ |
| `profile` | トレースに基づく性能レポートを実行する。`--full` は全体を対象にする | ビルドの実行による |
| `inspect` | 解決済みの状態を事実として表示する（`config`、`plugins`、`content`、`graph`、`build`） | いいえ |

`doctor` は独立したチェックを可能な限り続行し、ヘルスチェックに失敗すると非ゼロで終了します。`inspect` は読み取り専用で、ビルドの実行や状態の書き込みは行いません。出力の読み方は [Diagnostics](../../docs/ja/docs/framework/diagnostics.md) と [Framework Inspector](../../docs/ja/docs/framework/inspector.md) を参照してください。

`clean` は Riebeckite が管理する成果物だけを削除します。option なしでは managed state root（`.riebeckite/`）、`--output` では Build 出力、`--all` では両方を削除します。対象が存在しなくてもエラーにならないため、script や CI から安全に実行できます。cold build を行う場合は `clean --all` の後に `build` を実行します（cache directory を別の場所に設定している場合、その場所は削除対象に含まれません）。

## 典型的な流れ

```sh
pnpm exec riebeckite check
pnpm exec riebeckite doctor
pnpm exec riebeckite inspect plugins
pnpm exec riebeckite build
```

## 関連資料

- [CLI Reference](../../docs/ja/docs/reference/cli.md)
- [Build System](../../docs/ja/docs/framework/build-system.md)
- [Diagnostics](../../docs/ja/docs/framework/diagnostics.md) / [Framework Inspector](../../docs/ja/docs/framework/inspector.md)

