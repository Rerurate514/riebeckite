---
title: Content Manager
sidebar:
  hidden: true
---

# Content Manager

走査済みのentryを完成したmanifestに変えるコンポーネントです。公開位置を解決し、MarkdownとPluginのパイプラインを実行してから、content graphと検索用のindexを作ります。

## 責務

- 各entryの公開位置を解決します。
- 各entryにMarkdownとPluginのパイプラインを実行します。
- content graphとcontent indexを作ります。
- manifestを組み立て、diagnosticを集めます。

## 処理の順序

公開位置の解決を先に行うため、後続のhookとページは安定したpermalinkを前提にできます。その後で処理、graphの順に進み、最後にmanifestを確定します。

## 行わないこと

Content Managerはファイルを読みません。読み取りはContent Sourceの役割です。
