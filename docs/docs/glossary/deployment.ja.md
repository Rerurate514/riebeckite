---
title: Deployment
sidebar:
  hidden: true
---

# Deployment

Build 済みのサイトを配信先へ配置する段階です。Build が manifest と生成物を用意し、Integration がそれを Cloudflare Workers などの platform につなぎます。

## 役割

- Build した出力を配信先へ公開します。
- 対象 platform 向けに Integration が担います。

## 関連用語

- [[ssg|SSG]]
- [[build|Build]]
- [[doctor|Doctor]]

## さらに詳しく

- [Deployment](../getting-started/deployment.ja.md)
- [HonoX Integration](../framework/honox-integration.ja.md)
