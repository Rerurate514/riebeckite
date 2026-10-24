---
date: 2026-10-20
title: "依存関係を宣言し、オプションを検証する"
sidebar:
  label: "14. 依存関係を宣言し、オプションを検証する"
  order: 14
---
# 依存関係を宣言し、オプションを検証する

ケイパビリティを使うと、あるプラグインが別のプラグインを import せずに依存できます。提供側は `provides`、必須の依存は `requires`、任意の依存は `optional` を宣言します。解決時には、`order` が逆でも提供側が利用側より前に置かれます。

```ts
import {
  definePlugin,
  type ConfigValidationIssue,
} from "@riebeckite/core";

export type CatalogOptions = {
  catalogPath?: string;
};

export function catalog(options: CatalogOptions = {}) {
  return definePlugin({
    name: "catalog",
    options,
    provides: ["example.catalog"],
    validateOptions: validateCatalogOptions,
  });
}

export function catalogSearch() {
  return definePlugin({
    name: "catalog-search",
    order: -10,
    requires: ["example.catalog"],
  });
}

function validateCatalogOptions(
  options: CatalogOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options) return [];

  const issues: ConfigValidationIssue[] = [];
  if (
    options.catalogPath !== undefined &&
    !options.catalogPath.startsWith("/")
  ) {
    issues.push({
      path: "catalogPath",
      message: "Use an absolute path such as /catalog.json.",
    });
  }

  return issues;
}
```

提供側がなくても動くなら、`requires` を `optional` に変えます。

```ts
optional: ["content.folder-pages"]
```

`validateOptions` は例外を投げずに問題点を返します。Riebeckite は設定ファイル内のパスを添えて報告するため、利用者はプラグインのソースを読まなくても値を直せます。

1 つのケイパビリティにつき、有効な提供側は 1 つだけです。同じケイパビリティを複数のプラグインが提供すると、解決に失敗します。

---

[プラグイン機能別レシピに戻る](./README.ja.md) · [Plugin API](../../reference/plugin-api.ja.md)
