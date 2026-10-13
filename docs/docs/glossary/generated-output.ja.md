---
title: 生成された出力
sidebar:
  hidden: true
---

# 生成された出力

プラグインによって生成された出力で、content output とは別物です。generated outputs には owner と dependencies があり、output dependency の宣言によって再生成が駆動される。

## 所有権と依存関係

 各 generated output には `producer` (例: `plugin:${output.owner}`) と `dependencies` リストがある。
 宣言された dependencies がない場合、generated output は `unknown` となり、 full output regeneration をトリガーする。

## content output との比較

Content outputs are owned by content entries and have `content` type dependencies.
Generated outputs are owned by plugins and can have arbitrary dependency types.

## 関連用語

- [[ssg|SSG]]
- [[output-cache|出力キャッシュ]]
- [[output-dependency|出力依存性]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
