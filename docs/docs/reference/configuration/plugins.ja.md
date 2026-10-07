---
title: Plugin の設定
sidebar:
  label: Plugin の設定
  order: 60
---
# Plugin の設定

Plugin は `plugins` に指定します。

```ts id="93f0rv"
plugins: [
  obsidianMarkdown(),
  media(),
  attachment(),
]
```

条件によって Plugin を切り替えることもできます。

`PluginInput` では、

```text id="r4h4s2"
false
null
undefined
```

を無効な Plugin input として扱えます。

たとえば、

```ts id="7tk1jx"
plugins: [
  enableAnalytics && analytics(),
]
```

のような conditional configuration が可能です。

Config resolve 時に無効な input は除外され、有効な Plugin は安定した順序で整理されます。

その後 capability の整合性が検証されます。
