---
date: 2026-10-14
title: パイプライン（Pipeline）
sidebar:
  hidden: true
---

# パイプライン（Pipeline）

Markdownをmdastへパースし、remarkプラグインで変換し、hastへブリッジし、rehypeプラグインでHTMLを変換する処理パイプラインです。Coreが駆動し、プラグインが拡張します。

## パイプラインの段階

パイプラインは決まった順序で実行されます。

1. **Markdownのパース**：`remarkParse`、`remarkFrontmatter`、`remarkGfm`、`remarkMath`
2. **Remarkプラグイン**：サイト固有およびユーザー提供の `remarkPlugins`
3. **HTMLへのブリッジ**：`allowDangerousHtml: true` を指定した `remarkRehype`
4. **Rehypeプラグイン**：`rehypeRaw`、サイトが提供する `rehypePlugins`、`rehypeSlug`、`rehypeKatex`、`rehypeFormat`
5. **HTMLの文字列化**：`rehypeStringify`

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
