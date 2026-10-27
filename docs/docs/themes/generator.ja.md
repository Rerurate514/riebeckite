---
date: 2026-10-20
title: テーマジェネレーター
---
# テーマジェネレーター

`riebeckite create theme` は、公開されている `defineTheme` API を使って、`themes/` にローカルテーマを生成します。セマンティックトークンの `--rb-*` と、安定した `rb-*` / `rr-*` フックだけをスタイル対象にし、プラグインの実装 CSS を複製したり、機能を追加したりしません。テーマの公開契約については、[はじめてのテーマ作成](./writing-a-theme.ja.md)を参照してください。

## テーマを作成する

```sh
riebeckite create theme my-theme
riebeckite create theme my-theme --template blog --features print-styles
riebeckite create theme --list
```

標準のテンプレートは `minimal`、標準の生成先は `themes/my-theme/` です。生成されたファクトリは、サイトのバンドラーが解決するローカルのモジュール指定子 `/themes/my-theme/styles/theme.css` を参照します。既存のディレクトリは上書きしません。

テンプレートは `minimal`、`blog`、`documentation`、`portfolio`、`digital-garden`、`blank` です。最初の5つには、用途に応じた見た目のレシピが含まれます。`blank` には、公開ファクトリとスコープされたトークン宣言だけが入り、コンポーネントのスタイルは含まれません。

追加できる機能は `typography`、`code-blocks`、`callouts`、`cards`、`toc`、`responsive`、`animations`、`print-styles` です。いずれも公開フックだけをスタイル対象にします。ダークモードはテーマの契約の一部なので、既定で生成されます。単一のカラーモードを意図する場合だけ `--no-dark-mode` を使ってください。

## 対話モードとスクリプト

TTY で `riebeckite create theme` を実行すると、名前、生成先、テンプレート、機能、カラーモード、テスト、README、設定への登録を選択できます。CI やスクリプトでは対話的な入力ができないため、名前を指定してください。`--template`、`--features`、`--directory`、`--no-dark-mode`、`--no-tests`、`--no-docs`、`--register` を利用できます。

`--register` は、認識できる1行の `theme:` フィールドだけを安全に置き換え、ローカルのインポートを追加します。設定を安全に編集できない場合は変更せず、手動で登録する手順を表示します。

```ts
import { myThemeTheme } from "./themes/my-theme/index";

export default defineConfig({ theme: myThemeTheme() });
```

## 開発と検証

生成したローカルテーマは、サイトに登録する前にプレビューできます。

```sh
riebeckite theme preview my-theme
riebeckite theme preview my-theme --port 4173 --no-open
```

プレビューは、再現性のある Home、Article、Documentation、Components のフィクスチャを含む、隔離された一時的な HonoX サイトを起動します。テーマの実際のファクトリとスタイルシートのパスを使い、現在のサイトや Vault は変更しません。Ctrl+C で終了すると、一時ファイルを削除します。テーマ CSS の変更は Vite が更新し、`index.ts` を変更したときは開発サーバーを再起動して、開いているページを再読み込みします。レスポンシブ幅とシステムのカラースキーム設定は、ブラウザーの開発者ツールで確認してください。プレビューはローカルのテーマモジュールを実行するため、信頼できるテーマにだけ使用してください。

生成されたテストは、ファクトリとスタイルシートのモジュール指定子を検証します。ライト / ダーク、モバイル / デスクトップ、有効なプラグインとの共存を、サイト上で確認してください。テーマ CSS はフレームワークとプラグインのスタイルの後、設定した `stylesheets` の前に読み込まれます。機能はプラグインに、サイト固有の構造はアプリケーションに置いてください。

```sh
pnpm typecheck
pnpm test
riebeckite check
```
