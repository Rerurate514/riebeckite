---
date: 2026-10-14
title: Routable
sidebar:
  hidden: true
---

# Routable

URLで提供するentryを示す公開ビューで、unlistedのentryも含みます。ルーティングと出力生成は、discoverableではなくこのビューを使います。

## ビューに含まれるもの

URLと出力を受け取るすべてのentryです。unlistedのページもroutableで、一覧からは外しつつURLでは提供します。

## 使う側

ルーティングと出力生成がこのビューを読みます。routableでないページは出力を作りません。

## ContentManifestのルーティングビュー

`ContentManifest`はエントリを3つの重要なビューに分類します：

- `publicEntries`：公開またはunlistedとマークされたすべてのエントリ
- `byRoutablePermalink`：ルーティング可能なエントリのみ（publicとunlisted。draftとscheduledを除く）の`permalink => entry`マップ
- `byPermalink`：下書きと予約公開も含む完全なマップ

ルーティング処理は`byRoutablePermalink`から読み込むため、unlistedページはURLで提供されますが、一覧には載りません。`discoverableEntries`ビューはさらにリストやfeedに載せるエントリに絞るため、unlistedページはroutableですがdiscoverableからは除外されます。

```ts
// From packages/core/src/types/content_manifest.ts
interface ContentManifest {
  publicEntries: ContentManifestEntry[];
  byRoutablePermalink: Map<string, ContentManifestEntry>;
  byPermalink: Map<string, ContentManifestEntry>;
  discoverableEntries: ContentManifestEntry[];
}
```

## 公開状態とroutability

エントリのroutable状態は`resolvePublishingState`（`packages/core/src/content/publishing.ts`）で決定します：

- `visibility: "public"`→ `routable: true, discoverable: true`
- `visibility: "unlisted"`→ `routable: true, discoverable: false`
- `visibility: "draft"`→ `routable: false, discoverable: false`
- `visibility: "scheduled"`→ `routable: false, discoverable: false`（公開時刻までroutableになりません）
