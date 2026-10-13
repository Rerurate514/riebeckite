---
title: Fingerprint
sidebar:
  hidden: true
---

# Fingerprint

コンテンツやファイルの入力を識別し、変化を検出できるようにするハッシュです。保存した値と異なれば、依存するコンテンツを再処理します。

## 何を識別するか

contentのfingerprintはsourceとfrontmatter、pipeline、PluginのcacheVersionから作られます。fileのfingerprintはsourceのファイルが変わったときに変わります。pipelineのfingerprintにはPluginの設定とcontent filterの設定が含まれます。

## 使われ方

永続的なcontent cacheとBuild Stateがfingerprintを比べ、再処理する範囲を決めます。

## 関連用語

- [[glossary/build-dependency|Build Dependency]]
- [[cache-invalidation|Cache Invalidation]]
- [[glossary/cache|Cache]]
- [[persistent-cache|Persistent Cache]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
