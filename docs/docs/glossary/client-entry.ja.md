---
date: 2026-10-14
title: Client entry
sidebar:
  hidden: true
---

# Client entry

Client entryは、実行時に本当に必要なブラウザJavaScriptの初期化を宣言します。各entryはPlugin名、module specifier、任意のexport名、公開configを持ちます。

## 宣言

```ts
clientEntries: [
  {
    pluginName: "example",
    moduleSpecifier: "@riebeckite/plugin-example/client",
    exportName: "initExample",
    publicConfig: { selector: ".example" },
  },
]
```

## 使う場面

ブラウザでの初期化が本当に必要な場合だけClient entryを追加してください。SSRやビルド時だけで完結するPluginには、client用のJavaScriptを追加しないでください。`publicConfig`はclientの初期化処理に渡され、静的ホスト用にmanifestへ記録されます。

## 関連用語

- [[plugin|Plugin]]
- [[island|Island]]
- [[endpoint|Endpoint]]

## さらに詳しく

- [Plugin API](../reference/plugin-api.ja.md)
- [HonoX Integration](../framework/honox-integration.ja.md)
