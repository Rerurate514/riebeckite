---
title: Client entry
sidebar:
  hidden: true
---

# Client entry

Client entry は本当に runtime で必要なブラウザ JavaScript の初期化を宣言します; 各エントリは plugin name、module specifier、オプションの export name、public config を持ちます。

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

## 使用時

browser initialization が本当に必要な場合だけ client entries を追加してください。 SSR またはビルド時のみで完結するプラグインには client JavaScript を追加しないでください。 `publicConfig` は client initializer に渡され、static host 用に manifest に記録されます。

## 関連用語

- [[plugin|Plugin]]
- [[island|Island]]
- [[endpoint|Endpoint]]

## さらに詳しく

- [Plugin API](../reference/plugin-api.ja.md)
- [HonoX Integration](../framework/honox-integration.ja.md)
