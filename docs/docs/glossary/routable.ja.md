---
date: 2026-10-14
title: ルーティング対象（Routable）
sidebar:
  hidden: true
---

# ルーティング対象（Routable）

URLで提供するエントリを示す公開ビューで、非公開（unlisted）のエントリも含みます。ルーティングと出力生成は、検出可能ビューではなくこのビューを使います。

## ビューに含まれるもの

URLと出力を受け取るすべてのエントリです。[非公開（unlisted）](./unlisted.md)のページもルーティング対象で、一覧からは外しつつURLでは提供します。

## 使う側

ルーティングと[出力生成](./output-inventory.md)がこのビューを読みます。ルーティング対象でないページは出力を作りません。

## ContentManifestのルーティングビュー

`ContentManifest` はエントリの主要なビューを3つ持ちます。

- `publicEntries` — 公開境界がpublicまたはunlistedと判定したすべてのエントリ
- `byRoutablePermalink` — ルーティング対象のエントリだけ（publicとunlisted。draftと予約公開前を除く）の `permalink => entry` マップ
- `byPermalink` — 下書きと予約公開も含む完全なマップ

ルーティング処理は `byRoutablePermalink` から読むため、非公開（unlisted）のページはURLで提供されつつ、検出の対象からは外れます。`discoverableEntries` ビューはさらに、一覧やフィードに載せてよいエントリへ絞り込みます。そのため非公開（unlisted）のページはルーティング対象ですが、検出可能ではありません。

```ts
// From packages/core/src/types/content_manifest.ts
interface ContentManifest {
  publicEntries: ContentManifestEntry[];
  byRoutablePermalink: Map<string, ContentManifestEntry>;
  byPermalink: Map<string, ContentManifestEntry>;
  discoverableEntries: ContentManifestEntry[];
}
```

## 公開状態とルーティング可否

エントリのルーティング可否は `resolvePublishingState`（`packages/core/src/content/publishing.ts`）で決まります。

- `visibility: "public"` → `routable: true, discoverable: true`
- `visibility: "unlisted"` → `routable: true, discoverable: false`
- `visibility: "draft"` → `routable: false, discoverable: false`
- `visibility: "scheduled"` → `routable: false, discoverable: false`（公開時刻まで）
