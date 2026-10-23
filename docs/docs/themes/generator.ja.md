---
date: 2026-10-20
title: Theme Generator
---
# Theme Generator

`riebeckite create theme` は、公開 `defineTheme` API を使うローカル Theme を `themes/` に生成します。Semantic Token の `--rb-*` と安定した `rb-*` / `rr-*` Hook だけをスタイル対象にし、Plugin の内部 CSS を複製したり機能を追加したりしません。Theme の公開契約は [Theme の作成](./writing-a-theme.ja.md) を参照してください。

## Theme を作成する

```sh
riebeckite create theme my-theme
riebeckite create theme my-theme --template blog --features print-styles
riebeckite create theme --list
```

標準テンプレートは `minimal`、標準の生成先は `themes/my-theme/` です。生成した factory はサイトの Bundler が解決するローカル Module Specifier `/themes/my-theme/styles/theme.css` を参照します。既存ディレクトリは上書きしません。

テンプレートは `minimal`、`blog`、`documentation`、`portfolio`、`digital-garden`、`blank` です。最初の五つには用途に応じた見た目のレシピが含まれます。`blank` には公開 factory、スコープされた Token 宣言、コンポーネントのスタイルを含まない最小構成だけが入ります。

追加機能は `typography`、`code-blocks`、`callouts`、`cards`、`toc`、`responsive`、`animations`、`print-styles` です。いずれも公開 Hook だけをスタイルします。Dark Mode は Theme の標準契約なので、既定で生成されます。単一の Color Mode を意図する場合だけ `--no-dark-mode` を使ってください。

## 対話モードとスクリプト

TTY で `riebeckite create theme` を実行すると、名前、生成先、テンプレート、機能、Color Mode、テスト、README、設定登録を選択できます。CI やスクリプトでは対話しないため、名前を指定してください。`--template`、`--features`、`--directory`、`--no-dark-mode`、`--no-tests`、`--no-docs`、`--register` を利用できます。

`--register` は認識できる一行の `theme:` フィールドだけを安全に置換し、ローカル import を追加します。設定を安全に編集できない場合は変更せず、手動登録の手順を表示します。

```ts
import { myThemeTheme } from "./themes/my-theme/index";

export default defineConfig({ theme: myThemeTheme() });
```

## 開発と検証

生成したローカル Theme は Site に登録する前に Preview できます。

```sh
riebeckite theme preview my-theme
riebeckite theme preview my-theme --port 4173 --no-open
```

Preview は決定的な Home、Article、Documentation、Components の Fixture を含む隔離された一時 HonoX Site を起動します。Theme の実際の Factory と Stylesheet Path を利用し、現在の Site や Vault は変更しません。Ctrl+C で終了すると一時ファイルを削除します。Theme CSS の変更は Vite が更新し、`index.ts` の変更時は Dev Server を再起動して開いているページを再読み込みします。Responsive Width と System の Color Preference はブラウザの開発者ツールで確認してください。Preview はローカル Theme Module を実行するため、信頼できる Theme のみに使用してください。

生成されたテストは factory と Stylesheet Module Specifier を検証します。Light / Dark、Mobile / Desktop、有効な Plugin との共存をサイト上で確認してください。Theme CSS は Framework と Plugin Style の後、`userCss` の前に読み込まれます。機能は Plugin、サイト固有の構造は Application に置いてください。

```sh
pnpm typecheck
pnpm test
riebeckite check
```
