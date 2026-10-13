---
title: Deployment
sidebar:
  hidden: true
---

# Deployment

Build 済みのサイトを配信先へ配置する段階です。Build が manifest と生成物を用意し、Integration がそれを Cloudflare Workers などの platform につなぎます。

## Build が渡すもの

- manifest。
- generated output。
- 次の incremental build で使う build state。

## 配信先

integration が出力を platform につなぎます。静的ホスティングはファイルを直接配信し、worker や edge の配信先は runtime を通して配信します。
