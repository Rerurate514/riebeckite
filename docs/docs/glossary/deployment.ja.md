---
title: Deployment
sidebar:
  hidden: true
---

# Deployment

Build済みのサイトを配信先へ配置する段階です。Buildがmanifestと生成物を用意し、IntegrationがそれをCloudflare Workersなどのplatformにつなぎます。

## Buildが渡すもの

- manifest。
- generated output。
- 次のincremental buildで使うbuild state。

## 配信先

integrationが出力をplatformにつなぎます。静的ホスティングはファイルを直接配信し、workerやedgeの配信先はruntimeを通して配信します。
