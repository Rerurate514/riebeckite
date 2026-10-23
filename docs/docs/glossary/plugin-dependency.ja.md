---
date: 2026-10-14
title: Plugin dependency
sidebar:
  hidden: true
---

# Plugin dependency
Pluginは`requires`でCapabilityの要求を宣言します。依存解決は、Capabilityを提供するPluginを、それを利用するPluginより前に並べます。要求を満たせない場合は`PluginDependencyError`を報告し、`kind`と`pluginName`で原因を特定できます。

## Capabilityのfield
`provides`: このPluginが他へ提供するCapability。
`requires`: 必須のCapability。このPluginを実行する前に解決されている必要があります。
`optional`: 存在すれば使いますが、必須ではないCapability。

## 解決の順序
依存解決はまず`order`で並べ替え、次にCapabilityの依存関係を満たします。必須のCapabilityが欠けていると`PluginDependencyError`になります。提供側の重複や依存の循環は設定エラーです。

## エラーの種類
`PluginDependencyError`は5種類のCapability問題を報告します：

- `missing-capability`：プラグインが`requires`で指定したCapabilityを、他のプラグインが提供していません。利用可能なCapability一覧がエラーに含まれます。
- `duplicate-provider`：複数のプラグインが同じCapabilityを`provides`で宣言しています。競合するプラグイン名がリストされます。
- `self-dependency`：プラグインが`provides`で宣言したCapabilityを、`requires`でも要求しています。
- `invalid-capability`：プラグインが`provides`、`requires`、または`optional`で空文字または空白のみのCapability名を宣言しています。
- `cycle`：プラグインの`requires`/`provides`チェーンに循環依存が存在します。循環は`kind: "cycle"`でThrowされ、Capability名とプラグインチェーンが含まれます。

## 例
```ts
definePlugin({
  name: "consumer",
  requires: ["content.graph"],
});
```
```
mermaid
flowchart LR
  Provider["Provider<br/>provides: content.graph"]
  Consumer["Consumer<br/>requires: content.graph"]
  Provider --> Consumer
```
## 関連用語
- [[plugin|Plugin]]
- [[capability|Capability]]
- [[lifecycle-hook|Lifecycle hook]]
- [[content-hook|Content hook]]
- [[endpoint|Endpoint]]

## さらに詳しく
- [Plugin API](../reference/plugin-api.ja.md)
- [Plugin System](../framework/plugin-system.ja.md)