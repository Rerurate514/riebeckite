---
date: 2026-10-27
title: Theme configuration
sidebar:
  label: Theme configuration
  order: 70
---
# Theme configuration

Pass a theme instance to `theme`.

```ts
import { defaultTheme } from "@riebeckite/theme-default";

export default defineConfig({
  theme: defaultTheme({
    colorMode: "system",
    layout: "article",
    preset: "reading",
    settings: { typography: "serif" },
    stylesheets: ["/site.css"],
  }),
});
```

Settings are specific to the selected theme and are validated against its schema. See [Theme API](../theme-api.md) for schema definitions and CSS reflection.