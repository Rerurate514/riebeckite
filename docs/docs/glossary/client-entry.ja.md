---
date: 2026-10-14
title: クライアントエントリ（Client Entry）
sidebar:
  hidden: true
---

# クライアントエントリ（Client Entry）

クライアントエントリは、実行時に本当に必要なブラウザJavaScriptの初期化を宣言します。各エントリはプラグイン名、module specifier、任意のexport名、初期化処理に渡す公開設定を持ちます。

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

ブラウザでの初期化が必要な場合にだけクライアントエントリを追加してください。SSRやビルド時に完結するプラグインには、クライアント用のJavaScriptを追加しないでください。`publicConfig`はクライアントの初期化処理に渡され、静的ホスト向けにマニフェストへ記録されます。

## 関連用語

- [[plugin|Plugin]]
- [[island|Island]]
- [[endpoint|Endpoint]]

## さらに詳しく

- [Plugin API](../reference/plugin-api.ja.md)
- [HonoX Integration](../framework/honox-integration.ja.md)
