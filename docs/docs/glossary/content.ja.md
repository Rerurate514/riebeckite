---
title: Content
sidebar:
  hidden: true
---

# Content

Markdownの解析とPluginの処理を経たコンテンツです。frontmatter、描画済みのHTML、解決済みの公開位置を持ちます。Riebeckiteは生のファイルではなく、処理を終えたこの単位を扱います。

## ファイルではなく処理後の項目

Riebeckiteはファイルを読み取り、解析し、Pluginのパイプラインに通してから、サイト上の公開位置を解決します。以降に扱うのはcontentです。Content Entry、公開位置、関連のすべてがここに含まれます。

contentを問い合わせるコードは、ファイルシステムではなくmanifestを読みます。

## contentがたどる流れ

1. Content Sourceがファイルを見つけて読み取ります。
2. Content Managerが解析し、パイプラインを実行します。
3. 公開位置の解決がpermalinkを割り当てます。
4. 項目はContent Entryとしてmanifestに記録されます。
