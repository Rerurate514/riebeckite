---
title: Content Dependency
sidebar:
  hidden: true
---

# Content Dependency

ある entry の出力が別の entry に依存することを示す記録です。依存先が変わると、依存元を再処理して派生した内容の正しさを保ちます。

## 依存とみなすもの

WikiLink、embed、別の entry を読む Plugin の hook が content dependency を作ります。content graph は、この関係の供給元の一つです。

## 伝播

依存は cache invalidation に使われます。ノートを編集すると、それを embed するノートが無効化され、さらに連鎖して伝わります。
