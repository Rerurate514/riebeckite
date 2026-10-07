---
title: Theme の設定
sidebar:
  label: Theme の設定
  order: 70
---
# Theme の設定

Theme は `theme` で設定します。

```ts id="pgj2be"
theme: {
  colorMode: "system",
  articleLayout: "article",
}
```

raw configuration または宣言済み Theme を利用できます。

Theme は presentation の設定です。

HonoX、Vite、Cloudflare など Integration 固有の設定を Core configuration へ入れないでください。

```mermaid id="m54zmx"
flowchart TD
    Config["Riebeckite Config"]

    Config --> Site["Site"]
    Config --> Content["Content"]
    Config --> Markdown["Markdown"]
    Config --> Theme["Theme"]
    Config --> Plugins["Plugins"]

    Framework["HonoX / Vite / Platform"]
    Framework --> Integration["Integration Config"]

    Integration -. "Core Configへ混ぜない" .-> Config
```
