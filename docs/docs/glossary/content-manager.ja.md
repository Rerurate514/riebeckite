---
title: Content Manager
sidebar:
  hidden: true
---

# Content Manager

走査済みの entry を完成した manifest に変えるコンポーネントです。公開位置を解決し、Markdown と Plugin のパイプラインを実行してから、content graph と検索用の index を作ります。

## 責務

- 各 entry の公開位置を解決します。
- 各 entry に Markdown と Plugin のパイプラインを実行します。
- content graph と content index を作ります。
- manifest を組み立て、diagnostic を集めます。

## 処理の順序

公開位置の解決を先に行うため、後続の hook とページは安定した permalink を前提にできます。その後で処理、graph の順に進み、最後に manifest を確定します。

## 行わないこと

Content Manager はファイルを読みません。読み取りは Content Source の役割です。
