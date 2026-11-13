---
date: 2026-10-14
title: パイプライン（Pipeline）
sidebar.hidden: true
---

# パイプライン（Pipeline）

Markdown を mdast へパースし、remark プラグインで変換し、hast へブリッジし、rehype プラグインで HTML を変換する処理パイプラインです。Core が駆動し、プラグインが拡張します。

## パイプラインの段階

パイプラインは決まった順序で実行されます。

1. **Markdown のパース**：`remarkParse`、`remarkFrontmatter`、`remarkGfm`、`remarkMath`
2. **Remark プラグイン**：サイト固有およびユーザー提供の `remarkPlugins`
3. **HTML へのブリッジ**：`allowDangerousHtml: true` を指定した `remarkRehype`
4. **Rehype プラグイン**：`rehypeRaw`、サイトが提供する `rehypePlugins`、`rehypeSlug`、`rehypeKatex`、`rehypeFormat`
5. **HTML の文字列化**：`rehypeStringify`

```ts
import { Pipeline } from "@riebeckite/core";

const pipeline = new Pipeline(contentIndex, permalinks);
const post = await pipeline.execute(markdownContent);
```

## 関連用語

- [[renderer|Renderer]]
- [[content-hook|Content hook]]
- [[plugin|Plugin]]
- [[content-entry|Content Entry]]

## さらに詳しく

- [../framework/content-system.ja.md]
