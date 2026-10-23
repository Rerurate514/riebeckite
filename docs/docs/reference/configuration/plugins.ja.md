---
date: 2026-10-08
title: プラグインの設定
sidebar:
  label: プラグインの設定
  order: 60
---
# プラグインの設定

プラグインは `plugins` に指定します。

```ts id="93f0rv"
plugins: [
  obsidianMarkdown(),
  media(),
  attachment(),
]
```

条件によってプラグインを切り替えることもできます。

`PluginInput` では、次の値を無効なプラグイン入力として扱えます。

```text id="r4h4s2"
false
null
undefined
```

たとえば、次のような条件付きの設定が可能です。

```ts id="7tk1jx"
plugins: [
  enableAnalytics && analytics(),
]
```

設定の解決時に、無効な入力は除外され、有効なプラグインは安定した順序で並べられます。その後、ケイパビリティの整合性が検証されます。

設定のエラーは `ConfigValidationError` として報告されます。捕捉して隠さないでください。変更したら `riebeckite check` を実行してください。オプションの取り決めについては、[プラグインシステム](../plugin-api.ja.md)または[テーマシステム](../theme-api.ja.md)に進んでください。
