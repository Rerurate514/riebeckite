---
date: 2026-10-14
title: Generated Output
sidebar:
  hidden: true
---

# Generated Output

Pluginが生成する出力で、contentの出力とは別物です。所有者と依存関係を持ち、宣言されたoutput dependencyにしたがって再生成が決まります。

## 所有者と依存関係

各Generated Outputには`producer`（例: `plugin:${output.owner}`）と`dependencies`のリストがあります。依存関係が宣言されていないGenerated Outputは`unknown`となり、すべての出力の再生成を引き起こします。

## Generated Outputの依存関係タイプ

依存関係の型と意味は以下です：

- `content { slug }`：contentが変わると再生成をトリガーします。
- `tag { tag }`：そのtagを持つcontentが変わると再生成をトリガーします。
- `folder { folder }`：そのfolder内のcontentが変わると再生成をトリガーします。
- `global`：どのcontentも変わると再生成をトリガーします。
- `unknown`：常に全出力再生成をトリガーします。依存関係が宣言されていないGenerated Outputは`unknown`として扱われます。

## contentの出力との違い

contentの出力はcontent entryが所有し、`content`型の依存関係を持ちます。Generated OutputはPluginが所有し、任意の型の依存関係を持てます。この違いはIncremental SSGで重要です：content outputは`content`依存に基づいて選択的に無効化できますが、`unknown`依存を持つGenerated Outputは全出力再生成を強制します。

Generated Outputの依存関係宣言例：

```json
// content依存を持つGenerated Output
{
  "kind": "generated",
  "path": "/js/bundle.js",
  "producer": "plugin:remark-gfm",
  "dependencies": [{ "type": "content", "slug": "blog-post-1" }]
}

// unknown依存を持つGenerated Output（全再生成をトリガー）
{
  "kind": "generated",
  "path": "/api/data.json",
  "producer": "plugin:custom-plugin",
  "dependencies": [{ "type": "unknown" }]
}

- [[ssg|SSG]]
- [[output-cache|Output Cache]]
- [[output-dependency|Output Dependency]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
