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

## 読み取るだけで再計算しない

リンク、feed、sitemap、メタデータはpermalinkを読みます。slugやファイルのパスからURLを組み直すとredirectやlocalizationを飛ばし、404を生むことがあります。
