---
date: 2026-10-08
title: セットアップと作成
sidebar:
  label: セットアップと作成
  order: 10
---
# セットアップと作成

## `upgrade --check`

Upgrade Lab は更新前の check-only 検証です。プロジェクト、lockfile、`node_modules`、`dist`、`.riebeckite` は更新しません。プロジェクトを一時ディレクトリへ二つ複製し、ライフサイクルスクリプトと pnpmfile を無効にして、現行の依存関係と指定した Riebeckite バージョンを比較します。

```sh
pnpm exec riebeckite upgrade --check --to 0.0.33
pnpm exec riebeckite upgrade --check --to latest --json
```

レポートでは依存関係・ peerDependencies ・ Node engines の解決、`tsconfig.json` がある場合の TypeScript 検査、`riebeckite check`、diagnostics、本番のフルビルド、生成 URL、出力ファイルを比較します。`READY` は両環境が成功し、URL と出力ファイルに差分がない状態です。候補版の失敗または差分は `REVIEW REQUIRED`、隔離した依存関係の解決失敗は `BLOCKED`、baseline の失敗や安全に実行できない検査は `UNVERIFIED` です。

対応するのは、`package-lock.json` と `pnpm-lock.yaml` のどちらか一方だけがある npm / pnpm プロジェクトです。symlink とプロジェクト外の content root は複製せず、境界を越えずに `UNVERIFIED` を返します。install scripts、pnpmfile、デプロイ、ブラウザー E2E は実行しません。一時ディレクトリはセキュリティ sandbox ではなく、ビルドはサイト自身の設定とプラグインを実行します。子プロセスには実行に必要な PATH、OS の一時ディレクトリ変数、一時的なホームディレクトリ変数、および隔離した npm cache と user config だけを渡します。これにより環境変数の秘密情報が意図せず渡ることは抑えられますが、信頼できないビルドコードを安全に実行できるわけではありません。

## `init`

`init` は、設定、Vite/HonoX のアプリケーションシェル、ルート、スタイルシート、スターターコンテンツを含む自己完結したサイトを、対象ディレクトリに生成します。対象ディレクトリの既定値はカレントディレクトリです。生成されたサイトは、Riebeckite モノレポに依存しない自己完結したアプリケーションです。

```sh id="18r7wl"
npm exec riebeckite init
```

別の場所にサイトを作る場合は、ディレクトリを指定します。

```sh id="81jmbp"
npm exec riebeckite init my-site
```

依存関係をインストールしてから、生成したサイトで `check` と `build` を実行してください。

### プリセットの選び方

構成は `--preset <name>` で選びます（既定値: `starter`）。

```sh id="vt7gdb"
npm exec -- riebeckite init my-site --preset starter
```

`--list-presets` を実行すると、利用できるプリセットとその説明を確認できます。

```sh id="b0n6ph"
npm exec -- riebeckite init --list-presets
```

### Feature Packを追加する

`--features <names>` には、任意の Pack をカンマ区切りで指定します。指定できるのは `knowledge`、`diagrams`、`media`、`i18n` です。`none` は Pack を追加しません。プリセットがすでに選んだ Plugin と重複する Pack はエラーになります。

```sh
npm exec -- riebeckite init my-site --preset portfolio --features diagrams,i18n
```

### プロジェクトファイルの選び方

プロジェクトファイルはプリセットとは別に、`--utilities <names>` で選びます。値には `gitignore`、`editorconfig`、`gitattributes`、`biome`、`npmrc`、`vscode` をカンマ区切りで指定します。

```sh id="pf8k21"
npm exec -- riebeckite init my-site --utilities editorconfig,npmrc,vscode
```

| 名前 | ファイル |
| --- | --- |
| `gitignore` | `.gitignore` |
| `editorconfig` | `.editorconfig` |
| `gitattributes` | `.gitattributes` |
| `biome` | `biome.json` |
| `npmrc` | `.npmrc` |
| `vscode` | `.vscode/settings.json` |

既定値は `gitignore,editorconfig,gitattributes,biome` で、`none` を指定すると何も書き込みません。対話モードでは、`Extra project files` の質問で既定のセットがあらかじめ選択されています。

### 生成先にファイルがすでにある場合

`init` は、生成対象のファイルがすでにあるディレクトリには、`--force` を指定しない限り書き込みません。

```sh id="l5kjod"
npm exec -- riebeckite init my-site --force
```

`--force` は既存ファイルに影響するため、使用する前に内容を確認してください。

### `create-riebeckite`

`create-riebeckite` パッケージを使うと、`npx create-riebeckite` から同じジェネレーターを実行できます。`--preset`、`--features`、`--list-presets` フラグも同じように受け付けます。

```sh id="kyw0rx"
npx create-riebeckite
```

対話モードでは、[[glossary/content-source|コンテンツソース]]を尋ねたあと、デプロイ方法を尋ねます。

| 選択肢 | 生成されるもの |
| --- | --- |
| `Cloudflare Workers` | Wrangler の依存関係と `wrangler.jsonc`。依存関係のインストール後、`Deploy now?` を尋ねる |
| `GitHub Actions` | `wrangler.jsonc` と `.github/workflows/publish.yml` |
| `Not now` | デプロイ用のファイルを生成しない |

`Deploy now?` で `Yes` を選ぶと、雛形の生成直後にビルドと `riebeckite publish run --execute` が実行されます。`Later` を選ぶとサイトの生成だけを行い、次のコマンドで公開します。

```sh
npm run build
npm exec -- riebeckite publish run --execute
```

サイトを生成したら、依存関係をインストールして設定を確認します。

```sh id="gzg1my"
npm install
npm exec riebeckite check
npm exec riebeckite build
```

## `create`

`create` はジェネレーターの統一エントリポイントです。TTY では、サイト、プラグイン、テーマ、PageType、コンポーネントのどれを作成するかを尋ね、生成ロジックを重複させずに対応するジェネレーターへ処理を委譲します。

```sh
riebeckite create
riebeckite create site my-site --preset starter
riebeckite create plugin reading-time --features transform
riebeckite create theme my-theme --template blog --register
riebeckite create page-type glossary --path /glossary/ --with-tests
riebeckite create component note-card --target site --with-styles
riebeckite create --help
```

スクリプトからは対象を明示してください。`create site` は引数を `create-riebeckite` に渡します。`create plugin` と `create theme` は既存のオプションと非 TTY での検証を維持します。`create page-type` はプラグインの PageType を作成し、`create component` はサイト、プラグイン、テーマの責務境界を守ります。
