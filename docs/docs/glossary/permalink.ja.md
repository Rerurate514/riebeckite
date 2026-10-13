---
title: Permalink
sidebar:
  hidden: true
---

# Permalink

ノートの公開 URL として解決済みの正準値です。リンク、feed、sitemap、メタデータの唯一の出所であり、slug から再計算せず、公開位置の解決から得ます。

## 解決の順序

1. Core が logical path から既定の位置を解決します。
2. Plugin の location hook が、folder の接頭辞や locale の付与などで調整します。
3. 結果が entry の permalink として保存されます。

## 読み取るだけで再計算しない

リンク、feed、sitemap、メタデータは permalink を読みます。slug やファイルのパスから URL を組み直すと redirect や localization を飛ばし、404 を生むことがあります。
