---
date: 2026-10-14
title: Unlisted
sidebar:
  hidden: true
---

# Unlisted

URLでは提供しつつ、一覧やfeedには載せない公開状態です。routableだがdiscoverableではないため、共有用のリンクや下書きに近いページに向きます。

## 設定

```yaml
---
visibility: unlisted
---
```

## 効果

ページはroutableのままで出力も作りますが、discoverableのビューから外れるため、一覧やfeedには載りません。

## 公開状態

unlistedは`PublishingVisibility`の一つです（`packages/core/src/content/publishing.ts`）。frontmatterで`visibility: unlisted`が設定されると、`resolvePublishingState`は`routable: true, discoverable: false`を返します。つまり：

- ページはURLで提供され、出力も生成されます
- `discoverableEntries`ビューから除外されます
- 一覧、feed、taxonomy用のページには表示されません
- 直接のURLやWikiLinkで参照することはできます

## ドラフトとの違い

`draft`のvisibilityとは異なり、unlistedページは公開された状態でroutableです。draft（`published: false`や`visibility: draft`）はルーティングから完全に除外され、公開されるまで公出力は作られません。
