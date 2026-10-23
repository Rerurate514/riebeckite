---
date: 2026-10-14
title: 添付ファイル（Attachment）
sidebar:
  hidden: true
---

# 添付ファイル（Attachment）

コンテンツツリー内にあり、コンテンツエントリではなくアセットとして配信されるファイルです。添付ファイルは論理パスを保ったまま公開URLに対応し、何を公開して安全かは公開境界が決めます。

## 添付ファイルとURL

画像、PDF、その他のMarkdown以外のファイルは論理パスを保ち、公開URLに対応します。通常のMarkdownリンクまたは埋め込みで参照します。

## 添付ファイルとコンテンツマニフェスト

添付ファイルはコンテンツエントリではなく、`ContentManifestEntry.assets`（`packages/core/src/types/content_manifest.ts`）で管理されます。`publicEntries`、`discoverableEntries`、タクソノミーやシリーズのビューには現れません。公開URLは、公開境界の設定に従ってアセットサーバーが生成します。

```ts
// From packages/core/src/types/content_manifest.ts
interface ContentManifestEntry {
  // ...
  assets: ContentAsset[];
  // ...
}
```

## 境界

公開URLになるのはコンテンツツリー内のファイルだけです。何を公開して安全かは公開境界が決めるため、ルートの外にある任意のファイルは公開されません。
