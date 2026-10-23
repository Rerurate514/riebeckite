---
date: 2026-10-14
title: Pipeline
sidebar:
  hidden: true
---

# Pipeline

Markdownがmdastにパースされ、remarkプラグインが変換し、hastにブリッジされ、rehypeプラグインがHTMLを変換するMarkdownからHTMLへの処理パイプラインです。Coreが駆動し、プラグインが拡張します。

## パイプラインの段階

パイプラインは以下の順序で実行されます。

1. **Markdown解析**: `remarkParse`, `remarkFrontmatter`, `remarkGfm`, `remarkMath`
2. **Remarkプラグイン**: サイト固有・ユーザー提供の`remarkPlugins`
3. **HTMLへのブリッジ**: `remarkRehype`with `allowDangerousHtml: true`
4. **Rehypeプラグイン**: ユーザー提供の`rehypePlugins`, `rehypeSlug`, `rehypeKatex`, `rehypeFormat`
5. **HTML文字列化**: `rehypeStringify`

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