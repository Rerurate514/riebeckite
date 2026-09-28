# Development Guide

## workspace の基本操作

```sh
pnpm install
pnpm lint
pnpm format
pnpm check
pnpm build
```

`lint` は Biome lint、`format` は format を書き込みます。root の `check` も Biome check を write mode で実行するため、read-only validation とみなさず差分を確認してください。framework の動作確認は [CLI](cli.md) の Riebeckite command を利用します。

## 変更手順

1. [Architecture](architecture.md) で owner package を決めます。
2. `packages/core/index.ts` など public export と類似実装を読みます。
3. dependency direction と build/runtime boundary を保ちます。
4. 振る舞い変更には焦点を絞った test を追加・更新します。
5. 最小の relevant validation から実行し、必要な repository check を続けます。

Core に HonoX や `apps/web` を import して application 問題を解かず、再利用可能な plugin behavior を route に置かず、Theme に JavaScript/DOM transform を入れません。文書は英日版の相対 link と、責務・入力出力・失敗時・境界を同期します。
