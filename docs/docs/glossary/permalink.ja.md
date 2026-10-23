---
date: 2026-10-14
title: Permalink（正規の公開URL）
sidebar:
  hidden: true
---

# Permalink（正規の公開URL）

ノートの正規の公開URLとして解決された値です。リンク、フィード、サイトマップ、メタデータの唯一の出所であり、slugから再計算するのではなく、公開先の解決から得ます。

## 解決の順序

1. Coreが論理パスから既定の公開位置を解決します。
2. プラグインの位置フックが、フォルダの接頭辞やロケールの付与などで調整する場合があります。
3. 結果がエントリのpermalinkとして保存されます。

## permalinkの型と利用

permalinkは `ContentManifestEntry`（`packages/core/src/types/content_manifest.ts`）では `string` 型で、`ContentPublicLocation`（`packages/core/src/types/content_manifest.ts`）の一部として保存されます。リンク、フィード、サイトマップ、メタデータの唯一の出所です。

主なポイント：

- **解決**：公開先の解決時に `ContentLocationResolver`（`packages/core/src/content/content_location.ts`）が生成し、プラグインの `resolveContentLocations` フックを呼ぶ場合があります
- **安定性**：一度決まったpermalinkは、slugやファイルパスから再計算しないでください
- **読み取るだけで組み直さない**：リンク、フィード、サイトマップ、メタデータは、解決済みエントリからpermalinkを読むべきです。slugやファイルパスからURLを組み直すとリダイレクトや多言語化を飛ばし、404を生むことがあります

permalinkの値の例：

```ts
// Default: "/notes/hello/"
// With folder prefix: "/blog/notes/hello/"
// With locale: "/ja/notes/hello/"
```

テンプレートでの正しい使用例：

```tsx
<a href={entry.permalink}>Link to entry</a>
// ❌ Do not: <a href={buildUrlFromSlug(entry.slug)}>
```
