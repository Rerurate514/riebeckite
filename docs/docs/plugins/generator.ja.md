---
date: 2026-10-20
title: Plugin Generator
---
# Plugin Generator

`riebeckite create plugin` は、公開プラグイン API に沿ったローカルプラグインを `extensions/` に生成します。実装の出発点を作る機能であり、各拡張ポイントの解説は引き続き [Plugin の作成](./writing-a-plugin.ja.md) と関連するプラグインのドキュメントを参照してください。

TTY では `riebeckite create` を実行すると、サイトやテーマと並んでこのジェネレーターを選べます。`riebeckite create plugin` を直接使う方法もこれまでどおりです。

## プラグインを作成する

```sh
riebeckite create plugin my-plugin --template transform
riebeckite create plugin my-plugin --features transform,diagnostics,cache
```

標準の生成先は `extensions/my-plugin/` です。既存のディレクトリは上書きしません。`--directory extensions/my-plugin` で生成先を明示できます。`--no-tests` と `--no-docs` は任意ファイルを省略し、`--register` は `riebeckite.config.ts` への安全な登録を試みます。

登録は認識できる `plugins: []` 配列だけを編集します。安全に編集できない場合は設定を変更せず、手動で登録する必要があることを表示します。

## 対話モードとスクリプト

TTY で `riebeckite create plugin` を実行すると、名前、生成先、カンマ区切りの主要・補助機能、テスト、ドキュメント、登録の有無を入力できます。CI やスクリプトでは対話できないため、名前と `--template` または `--features` を指定してください。

## テンプレート

主要機能は `transform`、`renderers`、`content-hooks`、`urls`、`content-graph`、`pages`、`components`、`assets-and-client-entries`、`endpoints`、`seo`、`generated-files` です。

補助機能は `diagnostics`、`cache`、`dependencies-and-options`、`logging-and-tracing` です。

レジストリには各テンプレートに対応するプラグインのドキュメント、生成ファイル、設定要件、組み合わせの情報を記録しています。複数指定では `definePlugin` を 1 つだけ生成し、同じライフサイクルフックは 1 つにまとめます。公開出力には公開用のマニフェストビューを使います。

## 生成後の作業

生成コードを確認し、自動登録されなかった場合はファクトリを設定へ登録してください。エンドポイントの例は `discoverableEntries` を使い、ページと生成ファイルは draft / private のコンテンツを出力しません。クライアントエントリに渡すのは、明示した公開設定だけです。

```sh
pnpm test
pnpm typecheck
riebeckite check
```

よくあるエラーとして、存在しない機能 ID、ケバブケースではない名前、既存ディレクトリへの生成、非 TTY での不足引数があります。いずれも CLI が拒否します。
