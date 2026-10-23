---
date: 2026-10-14
title: プラグイン依存関係（Plugin Dependency）
sidebar:
  hidden: true
---

# プラグイン依存関係（Plugin Dependency）

プラグインは `requires` でケイパビリティの要求を宣言します。リゾルバは提供側を利用側より前に並べ、満たせないケイパビリティを `PluginDependencyError` と `kind`、`pluginName` の診断として報告します。

## ケイパビリティのフィールド

`provides`: このプラグインが他へ提供するケイパビリティ。
`requires`: このプラグインの実行前に解決されていなければならない必須のケイパビリティ。
`optional`: 存在すれば使うが、必須ではないケイパビリティ。

## 解決の順序

リゾルバはまず `order` でプラグインを並べ、次にケイパビリティの依存関係を満たします。必須のケイパビリティが欠けている場合は `PluginDependencyError` をスローします。提供者の重複や循環は設定エラーです。

## エラーの種類
`PluginDependencyError` は5種類のケイパビリティ問題を報告します。

- `missing-capability` — あるプラグインが `requires` で要求したケイパビリティを、他のどのプラグインも提供していない。エラーには他のプラグインが提供するケイパビリティの一覧が含まれる。
- `duplicate-provider` — 複数のプラグインが同じケイパビリティを `provides` で宣言している。エラーには競合するプラグイン名が含まれる。
- `self-dependency` — プラグインが `provides` で宣言したケイパビリティを `requires` でも要求している。
- `invalid-capability` — プラグインが `provides`、`requires`、`optional` のいずれかで、空または空白だけのケイパビリティ名を宣言している。
- `cycle` — プラグインの `requires`/`provides` の連鎖に循環依存がある。

## 例
```ts
definePlugin({
  name: "consumer",
  requires: ["content.graph"],
});
```

## 解決の詳細
リゾルバはまずすべての `provides` 宣言を集め、空の名前がないことを検証し、重複を調べます。次にプラグインごとに `requires` と `optional` の依存関係を集めます。必須のケイパビリティが欠けている場合は `kind: "missing-capability"` の `PluginDependencyError` をスローします。提供者の重複は `kind: "duplicate-provider"`、自己依存は `kind: "self-dependency"`、空のケイパビリティ名は `kind: "invalid-capability"` でスローします。循環は `kind: "cycle"` でスローされ、ケイパビリティ名とプラグインの連鎖が含まれます。

```mermaid
flowchart LR
  Provider["提供側<br/>provides: content.graph"]
  Consumer["利用側<br/>requires: content.graph"]
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
