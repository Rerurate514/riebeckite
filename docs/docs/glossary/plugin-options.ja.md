---
title: Plugin options
sidebar:
  hidden: true
---

# Plugin options

プラグインのオプションはプラグインファクトリに渡される設定値で、side effects のない pure `validateOptions` 関数で検証され、解決されたオプションはプラグイン `options` プロパティで利用できます。

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

## Validator 契約

validators は side effects を持っていてはならない — no filesystem scanning、no builds、no cache writes、external state への modification なし。問題を structured issues で返します。

## 関連用語

- [[config|Config]]
- [[plugin|Plugin]]

## さらに詳しく

- [Plugin API](../reference/plugin-api.ja.md)
