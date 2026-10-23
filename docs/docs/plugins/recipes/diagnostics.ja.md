---
date: 2026-10-20
title: "診断を返す"
sidebar:
  label: "11. 診断を返す"
  order: 11
---
# 診断を返す

プラグインから直接出力を print せず、構造化された診断を返します。CLI はコードごとにまとめて表示でき、テストでもコードを検証できます。

```ts
import { definePlugin, type Diagnostic } from "@riebeckite/core";

export function descriptionDiagnosticsPlugin() {
  let diagnostics: Diagnostic[] = [];

  return definePlugin({
    name: "description-diagnostics",
    buildStart: () => {
      diagnostics = [];
    },
    onManifestCreated: ({ manifest }) => {
      for (const entry of manifest.discoverableEntries) {
        const description = entry.frontmatter.description;
        if (typeof description === "string" && description.trim() !== "") {
          continue;
        }

        diagnostics.push({
          code: "example/missing-description",
          severity: "warning",
          message: "Add a description for search and social previews.",
          slug: entry.slug,
          suggestion: "Set `description` in the frontmatter.",
        });
      }
    },
    addDiagnostics: () => diagnostics,
  });
}
```

`addDiagnostics` が受け取るのはプラグインのコンテキストで、manifest は含まれません。上の例のように `onManifestCreated` で対象を集めます。最終的な文書全体が必要なルールでは `inspectGeneratedHtml` を使います。integration が出力した HTML ファイルごとに呼び出します。

```ts
inspectGeneratedHtml: ({ path, html }) => {
  if (html.includes("<html lang=")) return [];

  return [
    {
      code: "example/missing-language",
      severity: "warning",
      message: "The document does not declare a language.",
      filePath: path,
    },
  ];
}
```

`warning` は公開を止めない内容に、`error` はリリースを止めるべき問題に使います。実際にコマンドを失敗させるかは、診断を消費する integration 次第です。運用ログには診断ではなく `context.logger` を使ってください。

---

[プラグイン機能別レシピに戻る](./README.ja.md) · [Plugin API](../../reference/plugin-api.ja.md)
