---
title: Content Dependency
sidebar:
  hidden: true
---

# Content Dependency

あるentryの出力が別のentryに依存することを示す記録です。依存先が変わると、依存元を再処理して派生した内容の正しさを保ちます。

## 依存とみなすもの

WikiLink、embed、別のentryを読むPluginのhookがcontent dependencyを作ります。content graphは、この関係の供給元の一つです。

## 伝播

依存は[cache invalidation](./cache-invalidation.md)に使われます。content dependency tracker (`packages/core/src/content/content_dependency_tracker.ts`)が依存関係を記録し、build coordinatorが依存先のentryを無効化します。ノートの内容が変更されると、派生コンテンツ（HTMLやgraphエッジなど）が次のビルドで再生成され、正しさが保たれます。

例）dependency trackingの流れ：

1. entry Aが編集され、entry BへWikiLinkを含んでいる
2. content dependencyのtrackerが、BをAへの依存として記録します。
3. 以降のビルドでAのfingerprintが変更
4. build coordinatorはBをinvalidatedとしてマーク
5. entry Bのコンテンツが再処理され、派生コンテンツの正しさが保たれる

Pluginは`extendContentGraph`やカスタムhookを介して他のentryを読み取ることで依存を作成でき、これらはcoreで解決された依存と併せて追跡されます。

依存はcache invalidationに使われます。ノートを編集すると、それをembedするノートが無効化され、さらに連鎖して伝わります。
