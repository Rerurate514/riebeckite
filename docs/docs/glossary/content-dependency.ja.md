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

依存はcache invalidationに使われます。ノートを編集すると、それをembedするノートが無効化され、さらに連鎖して伝わります。
