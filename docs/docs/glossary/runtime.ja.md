---
date: 2026-10-14
title: Runtime
sidebar:
  hidden: true
---

# Runtime

Buildの後に、サイトがページを配信し問い合わせに答える段階です。Runtimeのコードは、コンテンツを再処理せずmanifestとページのデータを読みます。

## runtimeとbuild time

| 段階 | 行うこと |
| --- | --- |
| Build time | コンテンツを処理し、公開位置を解決し、出力を書き出す |
| Runtime | ページを配信し、問い合わせに答える |

## runtimeが読むもの

Markdownを再解析しないため、コンテンツを解釈する場所はBuildだけです。

## runtimeとbuild timeの詳細
Riebeckiteの設計ではbuild timeとruntimeの分離が重要な原則です：

| 段階 | 行うこと |
| --- | --- |
| Build time | コンテンツを処理し、公開位置を解決し、出力を書き出す |
| Runtime | ページを配信し、問い合わせに答える |

 runtime時、サイトは`.riebeckite/`ディレクトリからresolved manifestとページデータを読み込みます。runtimeはMarkdownを再解析せず、l10n検出を実行せず、publish戦略を再解決しません。つまり：

- ページHTMLはすでに描画され、キャッシュされています
- 言語localization (`lang`frontmatter, `hreflang`link)はすでに適用されています
- publish戦略フィルタはすでに適用されています
- 検索indexはすでにビルドされています

 runtimeコードは通常HonoXのようなホストフレームワークで実行され、manifestを読み取ってどのページを配信するか、どのhead tagsを含めるかを決定します。この分離によって、content interpretationのソースはbuild単一の真実となり、runtimeはdeliveryに焦点を当てます。

```ts
// Example: runtime reads manifest to determine page
const manifest = require("./.riebeckite/manifest.json");
const page = manifest.pages[requestedPath];
```
