---
date: 2026-10-14
title: 生成物（Generated Output）
sidebar:
  hidden: true
---

# 生成物（Generated Output）

プラグインが生成する出力で、コンテンツの出力とは別物です。生成物は所有者と依存関係を持ち、再生成は出力依存関係の宣言に従って決まります。

## 所有者と依存関係

各生成物は`producer`（例：`plugin:${output.owner}`）と、`OutputDependency`型の`dependencies`の一覧を持ちます。依存関係を宣言していない生成物は`unknown`となり、出力全体の再生成を引き起こします。

## 生成物の依存関係の種類

各生成物は`producer`（例：`plugin:${output.owner}`）と、`OutputDependency`型の`dependencies`の一覧を持ちます。依存関係の種類と意味は次のとおりです。

- `content { slug }` — そのコンテンツが変わった。
- `tag { tag }` — そのタグを持つコンテンツが変わった。
- `folder { folder }` — そのフォルダー内のコンテンツが変わった。
- `global` — どのコンテンツかが変わった。
- `unknown` — 常に出力全体の再生成を引き起こす。依存関係を宣言していない生成物は`unknown`になる。

## コンテンツの出力との比較

コンテンツの出力はコンテンツエントリが所有し、`content`型の依存関係を持ちます。
生成物はプラグインが所有し、任意の種類の依存関係を持てます。この違いは増分SSGで重要です。コンテンツの出力は`content`依存関係に基づいて選択的に無効化できますが、`unknown`の依存関係を持つ生成物は出力全体の再生成を強制します。

生成物の依存関係の宣言例：

```json
// Generated output with content dependency
{
  "kind": "generated",
  "path": "/js/bundle.js",
  "producer": "plugin:remark-gfm",
  "dependencies": [{ "type": "content", "slug": "blog-post-1" }]
}

// Generated output with unknown dependency (triggers full regeneration)
{
  "kind": "generated",
  "path": "/api/data.json",
  "producer": "plugin:custom-plugin",
  "dependencies": [{ "type": "unknown" }]
}
```

## 関連用語

- [[ssg|SSG]]
- [[output-cache|Output Cache]]
- [[output-dependency|Output Dependency]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
