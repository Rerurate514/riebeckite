---
date: 2026-10-20
title: "コンテンツの各段階に処理を挟む"
sidebar:
  label: "3. コンテンツの各段階に処理を挟む"
  order: 3
---
# コンテンツの各段階に処理を挟む

コンテンツフックを使うと、Markdown パイプライン全体を置き換えずに、ビルドの途中でコンテンツを確認したり変更したりできます。

| フック | 実行されるタイミング | 典型的な用途 |
| --- | --- | --- |
| `onConfigResolved` | 設定が解決され、公開 URL を決める前 | `site.baseUrl`、ロケール、オプションを取得 |
| `onContentLoaded` | Markdown を読み込み、解析する前 | 生のソースを検証 |
| `onPostParsed` | frontmatter と Markdown を解析した後 | 解析済みの投稿を調整 |
| `onPostProcessed` | Markdown / HTML パイプラインの後 | 最終的な投稿 HTML を変更 |
| `onManifestCreated` | エントリ、リンク、ページが揃った後 | headタグを追加、サイト全体を検査 |

次のプラグインは `TODO` を検出して診断に記録し、マニフェストの生成後にまとめて報告します。

```ts
import { definePlugin, type Diagnostic } from "@riebeckite/core";

export function todoCheckPlugin() {
  const diagnostics: Diagnostic[] = [];

  return definePlugin({
    name: "todo-check",
    buildStart: () => {
      diagnostics.length = 0;
    },
    onContentLoaded: ({ slug, markdown }) => {
      const lines = markdown.split(/\r?\n/);
      const index = lines.findIndex((line) => line.includes("TODO"));
      if (index === -1) return;

      diagnostics.push({
        code: "example/todo",
        severity: "warning",
        message: "Remove the TODO before publishing.",
        slug,
        line: index + 1,
      });
    },
    addDiagnostics: () => diagnostics,
  });
}
```

`addDiagnostics` は `onManifestCreated` の後に実行されます。診断に `pluginName` がない場合、Riebeckite がプラグイン名を補うため、CLI は警告の出どころをプラグイン名で示せます。

すべてのエントリを見る必要がある処理は、`onManifestCreated` に置きます。たとえば、文書の headタグを追加する処理です。

```ts
onManifestCreated: ({ manifest }) => {
  for (const entry of manifest.publicEntries) {
    const author = entry.frontmatter.author;
    if (typeof author !== "string") continue;

    entry.headTags = [
      ...(entry.headTags ?? []),
      {
        tag: "meta",
        attrs: { name: "author", content: author },
      },
    ];
  }
}
```

`onPostProcessed` では `content.html` を変更できます。ただし、出力の所有者がはっきりしている場合は、レンダラーやページタイプを優先してください。全記事に断片を注入すると、レイアウトを把握しにくくなります。

---

[プラグイン機能別レシピに戻る](./README.ja.md) · [Plugin API](../../reference/plugin-api.ja.md)
