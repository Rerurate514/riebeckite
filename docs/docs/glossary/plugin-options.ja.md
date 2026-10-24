---
date: 2026-10-14
title: プラグインオプション（Plugin Options）
sidebar:
  hidden: true
---

# プラグインオプション（Plugin Options）
プラグインオプションは、プラグインファクトリに渡す設定値です。副作用のない純粋な `validateOptions` 関数で検証され、解決済みのオプションはプラグインの `options` プロパティから参照できます。

## オプションの検証
```ts
type ExampleOptions = {
  enabled?: boolean;
};

export function example(options: ExampleOptions = {}) {
  return definePlugin({
    name: "example",
    options,
  });
}
```

## バリデータの契約
バリデータに副作用を持たせてはいけません。ファイルシステムの走査、ビルド、キャッシュへの書き込み、外部状態の変更は行いません。問題は構造化されたissueとして返します。バリデータの型は `PluginOptionsValidator<TOptions>` で、`options` を受け取って `readonly Issue[] | void` を返します。

## 関連用語
- [[config|Config]]
- [[plugin|Plugin]]

## さらに詳しく
- [Plugin API](../reference/plugin-api.ja.md)
