---
date: 2026-10-14
title: Content ID
sidebar:
  hidden: true
---

# Content ID

frontmatterに書く安定した識別子で、slugやpermalinkとは独立にノートを指します。ファイルの移動やURLの変更をまたいで残るため、外部から参照するときのキーになります。

## idとslugとpermalink

| 識別子 | 設定する主体 | 変わるタイミング |
| --- | --- | --- |
| `id` | 執筆者（frontmatter） | 編集しない限り変わらない |
| slug | ファイルのパス | ファイルを移動したとき |
| permalink | 公開位置の解決 | URLの規則や設定を変えたとき |

## Content IDの解決

frontmatterの`id`フィールド(`packages/core/src/types/post_content.ts`)は、slugやpermalinkとは独立した安定した識別子を提供します。`id`がfrontmatterに存在する場合、それはマニフェストエントリ(`packages/core/src/types/content_manifest.ts`)の`contentId`として保存され、manifestの`byContentId`マップを通じて公開されます。

Content IDの用途：

- **外部参照**: ファイルがリネームされたりURLが変更されたりしても参照を維持する必要がある外部システムがノートを指す場合、`contentId`をslugやpermalinkではなく使用します
- **コレクション間のリンク**: 異なるコンテンツコレクションや外部システム間でリンクする場合、`contentId`はファイルの移動やURL変更に生存します
- **incremental buildキャッシュ**: `contentId`はキャッシュフィンガープリントの計算に含まれるため、ビルド間で正しく追跡されます

frontmatterに含む`id`の例:

```yaml
---
id: abc123
title: "Hello World"
tags: ["intro"]
---
```

コードによるContent IDでの検索例:

```ts
const entry = manifest.byContentId.get("abc123");
// entry.slug, entry.permalink, entry.frontmatter, etc.
```
