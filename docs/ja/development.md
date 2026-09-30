# Development Guide

## workspace の基本操作

```sh
pnpm install
pnpm lint
pnpm format
pnpm check
pnpm test
pnpm build
```

`lint` は Biome lint、`check` は Biome check を、どちらも読み取り専用で実行します（`check` はファイルを書き換えず、問題を報告するだけです）。`check` が報告した修正は `check:fix` で、format の書き込みは `format` で、書き込み系のスクリプトを明示してから適用し、差分を確認してください。framework の動作確認は [CLI](cli.md) の Riebeckite command を利用します。

テストはパッケージ単位で `pnpm test`（golden file を更新する場合は `pnpm test:update`）で実行します。配置、テストの書き方、新しいパッケージへの test script 追加は [Testing](testing.md) を参照してください。

## 変更手順

1. [Architecture](architecture.md) で owner package を決めます。
2. `packages/core/index.ts` など public export と類似実装を読みます。
3. dependency direction と build/runtime boundary を保ちます。
4. 振る舞い変更には焦点を絞った test を追加・更新します。
5. 最小の relevant validation から実行し、必要な repository check を続けます。

Core に HonoX や `apps/web` を import して application 問題を解かず、再利用可能な plugin behavior を route に置かず、Theme に JavaScript/DOM transform を入れません。文書は英日版の相対 link と、責務・入力出力・失敗時・境界を同期します。

## ドキュメントの変更

英語版と日本語版の記述は相対リンクで揃え、責務、入出力、失敗時の挙動、境界を説明してください（正常系だけにしない）。パッケージ間の不変条件が変わった場合は、エージェント向けガイド（[Agent documentation](../agents/README.md)）も更新します。

## 実装バックログの記録

初期構築時の実装バックログは [tasklist.md](../../tasklist.md) に記録しています（すべて完了済み）。作業の計画や進捗管理に使うのではなく、過去の判断経緯を確認したいときに参照してください。
