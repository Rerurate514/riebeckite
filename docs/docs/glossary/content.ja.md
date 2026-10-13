---
title: Content
sidebar:
  hidden: true
---

# Content

Markdown の解析と Plugin 処理を経たコンテンツです。frontmatter、描画済みの HTML、解決済みの公開位置を持ち、Riebeckite は生のファイルではなく処理後の項目を扱います。

## ファイルではなく処理後の項目

Riebeckite はファイルを読み、解析し、Plugin のパイプラインに通してから、サイト上の公開位置を解決します。それ以降に扱うのは content です。Content Entry、公開位置、関係のすべてが含まれます。

content を問い合わせるコードは、ファイルシステムではなく manifest を読みます。

## content がたどる流れ

1. Content Source がファイルを見つけて読み取ります。
2. Content Manager が解析し、パイプラインを実行します。
3. 公開位置の解決が permalink を割り当てます。
4. 項目は Content Entry として manifest に記録されます。
