---
date: 2026-11-04
title: Obsidian 向け Riebeckite
sidebar.label: Obsidianプラグイン
sidebar.order: 25
publish: false
---
# Obsidian 向け Riebeckite

Obsidian 向け Riebeckite は、Obsidian の Vault をローカルの Riebeckite 開発サーバーへ接続するための Obsidian プラグインです。現時点では、設定タブと **Open settings** コマンドを登録するだけの基盤です。サーバーへの接続、ノートの公開、Vault データの変更は行いません。

プラグインは Riebeckite 本体とは別のリポジトリで管理しています。[Rerurate514/riebeckite-obsidian](https://github.com/Rerurate514/riebeckite-obsidian) を参照してください。Riebeckite のモノレポには含まれず、実行時に依存しません。

## 現在の状態

| 領域 | 現在の動作 |
| --- | --- |
| 設定 | ローカルサーバーの URL を1つ保存する |
| コマンド | `Riebeckite: Open settings` |
| サーバー接続 | 未実装 |
| ノートの公開 | 未実装 |
| Vault の変更 | 一切行わない |

Obsidian の Community Plugins ディレクトリには登録されておらず、npm パッケージも公開していません。ローカルでビルドした成果物を手動で導入します。

## 必要なもの

- Obsidian 1.0.0 以降（`manifest.json` の `minAppVersion`）
- ソースからビルドする場合は Node.js 24.22.0 と Corepack
- pnpm 11.5.3（`packageManager` で固定）

`isDesktopOnly` は `false` です。Electron、Node、デスクトップ専用 API を使わないため、モバイル版の Obsidian でも読み込めます。デスクトップ専用の依存を追加する前に `true` へ変更する必要があります。

## 手動でインストールする

1. プラグインのリポジトリを取得し、ビルドします。

   ```sh
   git clone https://github.com/Rerurate514/riebeckite-obsidian.git
   cd riebeckite-obsidian
   corepack enable
   pnpm install --frozen-lockfile
   pnpm build
   ```

2. Vault にプラグインフォルダーを作ります。

   ```text
   <vault>/.obsidian/plugins/riebeckite/
   ```

3. `main.js` と `manifest.json` をそのフォルダーへコピーします。
4. Obsidian の **設定 → Community plugins** を開き、一覧を再読み込みして **Riebeckite** を有効にします。

`pnpm build` は本番用の `main.js` を生成し、マニフェストの検証を実行します。実行時に必要なファイルはこの2つだけです。

## 読み込み時の動作

Obsidian がプラグインを有効にすると、`onload` が次の順に処理します。

1. 保存済みデータを読み、`parseSettings` で検証する。
2. **Riebeckite** の設定タブを登録する。
3. **Riebeckite: Open settings** コマンドを登録する。

途中で例外が起きると、開発者コンソールへエラーを出力し、「Riebeckite could not be loaded. Check the console for details.」という通知を表示します。以降の登録処理は実行されません。

## 設定

| 設定項目 | 既定値 | 動作 |
| --- | --- | --- |
| Local server URL | `http://127.0.0.1:3000` | 入力の変更時に保存する |

設定タブには、ローカル開発サーバーとの連携が未接続である旨が表示されます。URL は将来の接続に向けた設定値として保存するだけで、リクエストは送りません。

保存済みデータは信頼しない入力として扱います。`parseSettings` は、値がオブジェクトで、`serverUrl` が `http:` または `https:` の URL として解釈できる文字列の場合だけ受け付けます。末尾のスラッシュを1つ除き、それ以外は既定値へ戻します。そのため、`updateSettings` に届いた無効な値は既定値として保存されます。

保存に失敗した場合は、開発者コンソールへエラーを出力し、「Riebeckite settings could not be saved.」という通知を表示して、入力欄を以前の値へ戻します。

読み込み時に無効なデータが見つかった場合、メモリ上の設定は既定値になります。次に保存するまで、設定ファイルは書き換えません。

## 現在行わないこと

- Riebeckite の開発サーバーを起動、停止、呼び出ししない。
- ノートを公開、移動、名前変更、削除しない。
- frontmatter を読んだり、公開対象を判定したりしない。
- `publish: true`、`content.directory`、ビルドを置き換えない。

公開は引き続き Riebeckite の CLI で行います。[Obsidian のノートを公開する](../guides/obsidian.ja.md) を参照してください。

## リポジトリの構成

| パス | 役割 |
| --- | --- |
| `src/main.ts` | プラグインの入口、コマンド、設定の読み込み |
| `src/settings/` | 設定モデル、検証、設定タブ |
| `src/lifecycle/` | Obsidian のライフサイクル外にあるリソースの破棄 |
| `scripts/` | ビルド、バージョン同期、リリース検証 |
| `test/` | 設定、破棄、リリースファイルのテスト |

実装の詳細と、接続機能を追加するときの方針は [プラグインのアーキテクチャ](./architecture.ja.md) で説明します。

## 次に読む

- [プラグインのアーキテクチャ](./architecture.ja.md)
- [Obsidian のノートを公開する](../guides/obsidian.ja.md)
- [プラグインのリポジトリ](https://github.com/Rerurate514/riebeckite-obsidian)
