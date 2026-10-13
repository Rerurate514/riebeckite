---
title: Generated Output
sidebar:
  hidden: true
---

# Generated Output

Pluginが生成する出力で、contentの出力とは別物です。所有者と依存関係を持ち、宣言されたoutput dependencyにしたがって再生成が決まります。

## 所有権と依存関係

各Generated Outputには`producer`（例: `plugin:${output.owner}`）と`dependencies`のリストがあります。依存関係が宣言されていないGenerated Outputは`unknown`となり、すべての出力の再生成を引き起こします。

## contentの出力との違い

contentの出力はcontent entryが所有し、`content`型の依存関係を持ちます。Generated OutputはPluginが所有し、任意の型の依存関係を持てます。

## 関連用語

- [[ssg|SSG]]
- [[output-cache|Output Cache]]
- [[output-dependency|Output Dependency]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
