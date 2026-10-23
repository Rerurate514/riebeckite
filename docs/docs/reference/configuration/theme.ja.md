---
date: 2026-10-08
title: テーマの設定
sidebar:
  label: テーマの設定
  order: 70
---
# テーマの設定

テーマは `theme` で設定します。

```ts id="pgj2be"
theme: {
  colorMode: "system",
  articleLayout: "article",
}
```

テーマの設定を直接書く方法と、宣言済みのテーマを利用する方法があります。

テーマは表示に関する設定です。

HonoX、Vite、Cloudflare など、インテグレーション固有の設定を Core の設定に混ぜないでください。

```mermaid id="m54zmx"
flowchart TD
    Config["Riebeckite の設定"]

    Config --> Site["サイト"]
    Config --> Content["コンテンツ"]
    Config --> Markdown["Markdown"]
    Config --> Theme["テーマ"]
    Config --> Plugins["プラグイン"]

    Framework["HonoX / Vite / プラットフォーム"]
    Framework --> Integration["インテグレーション設定"]

    Integration -. "Core の設定へ混ぜない" .-> Config
```
