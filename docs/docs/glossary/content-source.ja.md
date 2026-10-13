---
title: Content Source
sidebar:
  hidden: true
---

# Content Source

パイプラインの他の部分にコンテンツを供給する読み取りの抽象です。標準の実装はファイルシステムや Obsidian vault を読み取るため、Content Manager がファイルシステムを直接走査することはありません。

## 読み取り側の役割

content source は走査と読み取りを担います。パスとバイト列を持つ生の entry を返し、解析と公開位置の解決は後段で行います。

読み取りがインターフェースの背後にあるため、ローカルのディレクトリでも Obsidian vault でも、Content Manager を変えずに同じ Build で扱えます。

## 分離しておく理由

取得を分離すると、cache と incremental build がファイルの同一性をもとに判断でき、処理は受け取った entry に対して純粋なまま保てます。
