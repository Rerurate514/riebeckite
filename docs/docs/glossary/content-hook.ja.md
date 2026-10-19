---
title: Content hook
sidebar:
  hidden: true
---

# Content hook
Content hookは、コンテンツ処理の各フェーズに参加します。configの解決からcontentの読み込み、post parsed、post processed、content graph、manifestの作成、diagnosticsまでが対象です。

## 処理フェーズ
コンテンツ処理のパイプラインでhookが呼ばれる順序は次のとおりです。

`setup → buildStart → config resolved → public locations resolved → content loaded → Markdown/HTML pipeline → post parsed → post processed → content graph → manifest created → diagnostics → build end`

## hookの使い方
hookは本当に必要なフェーズだけに使ってください。たとえば`onContentLoaded`の中でmanifestの情報を組み立て直すように、後のフェーズの情報を前のフェーズで作り直さないでください。各hookは順次多くのデータを受け取ります：`onConfigResolved`は`config`を、`onContentLoaded`は生のコンテンツを、`onPostParsed`はparsed ASTを、`onPostProcessed`はprocessed HTMLを受け取り、`onManifestCreated`はフルなmanifestにアクセスできます。

## 関連用語
- [[plugin|Plugin]]
- [[lifecycle-hook|Lifecycle hook]]
- [[hook-context|Hook context]]
- [[renderer|Renderer]]
- [[glossary/diagnostics|Diagnostics]]

## さらに詳しく
- [Plugin API](../reference/plugin-api.ja.md)
- [Build Dependency の取り決め](../framework/build-dependency.ja.md)