---
date: 2026-10-14
title: コンテンツフック（Content Hook）
sidebar:
  hidden: true
---

# コンテンツフック（Content Hook）

コンテンツフックは、コンテンツ処理の名前付きの段階をつなぎます。設定の解決から、コンテンツの読み込み、post parsed、post processed、コンテンツグラフ、マニフェストの作成、診断までが対象です。

## 処理の段階

コンテンツ処理のパイプラインは、フックを次の順に並べます：`setup → buildStart → config resolved → public locations resolved → content loaded → Markdown/HTML pipeline → post parsed → post processed → content graph → manifest created → diagnostics → build end`。

## フックの使い方

本当に必要な段階にだけフックを使ってください。後の段階の情報を前の段階で作り直すのは避けてください。たとえば`onContentLoaded`の中でマニフェストの情報を組み立て直さないでください。各フックが受け取るデータは段階ごとに増えます。`onConfigResolved`は`config`を、`onContentLoaded`は生のコンテンツを、`onPostParsed`は解析済みのASTを、`onPostProcessed`は処理済みのHTMLを受け取り、`onManifestCreated`は完全なマニフェストにアクセスできます。

## 関連用語
- [[plugin|Plugin]]
- [[lifecycle-hook|Lifecycle hook]]
- [[hook-context|Hook context]]
- [[renderer|Renderer]]
- [[glossary/diagnostics|Diagnostics]]

## さらに詳しく
- [Plugin API](../reference/plugin-api.ja.md)
- [Build Dependency Contract](../framework/build-dependency.ja.md)
