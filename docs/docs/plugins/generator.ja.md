---
title: Plugin Generator
---
# Plugin Generator

`riebeckite create plugin` は、公開 Plugin API に沿ったローカル Plugin を `extensions/` に生成します。実装の出発点を作る機能であり、各拡張ポイントの解説は引き続き [Plugin の作成](./writing-a-plugin.ja.md) と関連する Plugin ドキュメントを参照してください。

TTY では `riebeckite create` を実行すると、Site や Theme と並んでこの Generator を選べます。`riebeckite create plugin` の直接利用もこれまでどおりです。

## Plugin を作成する

```sh
riebeckite create plugin my-plugin --template transform
riebeckite create plugin my-plugin --features transform,diagnostics,cache
```

標準の生成先は `extensions/my-plugin/` です。既存のディレクトリは上書きしません。`--directory extensions/my-plugin` で生成先を明示できます。`--no-tests` と `--no-docs` は任意ファイルを省略し、`--register` は `riebeckite.config.ts` への安全な登録を試みます。

登録は認識できる `plugins: []` 配列だけを編集します。安全に編集できない場合は設定を変更せず、手動登録が必要であることを表示します。

## 対話モードとスクリプト

TTY で `riebeckite create plugin` を実行すると、名前、生成先、カンマ区切りの主要・補助機能、テスト、ドキュメント、登録の有無を入力できます。CI やスクリプトでは対話しないため、名前と `--template` または `--features` を指定してください。

## テンプレート

主要機能は `transform`、`renderers`、`content-hooks`、`urls`、`content-graph`、`pages`、`components`、`assets-and-client-entries`、`endpoints`、`seo`、`generated-files` です。

補助機能は `diagnostics`、`cache`、`dependencies-and-options`、`logging-and-tracing` です。

レジストリには各テンプレートに対応する Plugin ドキュメント、生成ファイル、設定要件、組み合わせの情報を記録しています。複数指定では `definePlugin` を一つだけ生成し、同じライフサイクル Hook は一つに合成します。公開出力には公開用の manifest view を使います。

## 生成後の作業

生成コードを確認し、自動登録されなかった場合は factory を設定へ登録してください。Endpoint の例は `discoverableEntries` を使い、ページと生成ファイルは draft/private の Content を出力しません。Client Entry に渡すのは明示した公開設定だけです。

```sh
pnpm test
pnpm typecheck
riebeckite check
```

よくあるエラーとして、存在しない機能 ID、kebab-case ではない名前、既存ディレクトリへの生成、非 TTY での不足引数があります。いずれも CLI が拒否します。
