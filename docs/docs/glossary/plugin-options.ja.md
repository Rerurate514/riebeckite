---
title: Plugin options
sidebar:
  hidden: true
---

# Plugin options
PluginのオプションはPluginファクトリに渡す設定値です。副作用のない純粋な`validateOptions`関数で検証し、解決したオプションはPluginの`options`プロパティから参照できます。

## オプション検証
```ts
type ExampleOptions = {
  enabled?: boolean;
};

export function examplePlugin(options: ExampleOptions = {}) {
  return definePlugin({
    name: "example",
    options,
  });
}
```

## Validatorの取り決め
Validatorに副作用を持たせてはいけません。ファイルシステムの走査、ビルド、cacheへの書き込み、外部状態の変更は行いません。問題は構造化したissueとして返します。validatorの型は`PluginOptionsValidator<TOptions>`で、オプションを受け取って`readonly Issue[]| void`を返します。

## 関連用語
- [[config|Config]]
- [[plugin|Plugin]]

## さらに詳しく
- [Plugin API](../reference/plugin-api.ja.md)