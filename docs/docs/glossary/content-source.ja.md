---
title: Content Source
sidebar:
  hidden: true
---

# Content Source

パイプラインの他の部分にコンテンツを供給する読み取りの抽象です。標準の実装はファイルシステムやObsidian vaultを読み取るため、Content Managerがファイルシステムを直接走査することはありません。

## 読み取り側の役割

content sourceは走査と読み取りを担います。パスとバイト列を持つ生のentryを返し、解析と公開位置の解決は後段で行います。

読み取りがインターフェースの背後にあるため、ローカルのディレクトリでもObsidian vaultでも、Content Managerを変えずに同じBuildで扱えます。

## 分離しておく理由

取得を分離すると、cacheとincremental buildがファイルの同一性をもとに判断でき、処理は受け取ったentryに対して純粋なまま保てます。
