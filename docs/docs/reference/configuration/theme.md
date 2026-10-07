---
title: Theme configuration
sidebar:
  label: Theme configuration
  order: 70
---

# Theme configuration

Configure the theme with `theme`:

```ts
theme: {
  colorMode: "system",
  articleLayout: "article",
}
```

You can use a raw theme configuration or a declared theme.

A theme is a presentation setting. Do not put integration-specific settings (HonoX, Vite, Cloudflare, and so on) into the Core configuration.

```mermaid
flowchart TD
    Config["Riebeckite Config"]

    Config --> Site["Site"]
    Config --> Content["Content"]
    Config --> Markdown["Markdown"]
    Config --> Theme["Theme"]
    Config --> Plugins["Plugins"]

    Framework["HonoX / Vite / Platform"]
    Framework --> Integration["Integration Config"]

    Integration -. "do not mix into Core Config" .-> Config
```
