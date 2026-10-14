---
title: Permalink
sidebar:
  hidden: true
---

# Permalink

ノートの公開URLとして解決済みの正準値です。リンク、feed、sitemap、メタデータの唯一の出所であり、slugから再計算せず、公開位置の解決から得ます。

## 解決の順序

1. Coreがlogical pathから既定の位置を解決します。
2. Pluginのlocation hookが、folderの接頭辞やlocaleの付与などで調整します。
3. 結果がentryのpermalinkとして保存されます。

## permalinkの型と利用

permalinkは`ContentManifestEntry`(`packages/core/src/types/content_manifest.ts`)において`string`型として扱われ、`ContentPublicLocation`(`packages/core/src/types/content_manifest.ts`)の一部として保存されます。リンク、feed、sitemap、メタデータの唯一の出所です。

主なポイント：

- **解決**: `ContentLocationResolver`(`packages/core/src/content/content_location.ts`)によりlocation resolutionの際に生成され、pluginの`resolveContentLocations`hookが呼ばれる場合があります
- **安定性**: 決まってからslugやファイルパスから再計算するのではなく、解決されたentryからpermalinkを読み取るべきです
- **読み取るだけで再計算しない**: リンク、feed、sitemap、メタデータはentryからpermalinkを読み取ります。slugやファイルパスからURLを組み直すとredirectやlocalizationを飛ばし、404を生むことがあります

permalinkの値の例：

```ts
// デフォルト: "/notes/hello/"
// folder prefix付き: "/blog/notes/hello/"
// locale付き: "/ja/notes/hello/"
```

templateでの正しい使用例:

```tsx
<a href={entry.permalink}>entryへのリンク>
// ❌ するな: <a href={slugからURLを組み直す}>
```
