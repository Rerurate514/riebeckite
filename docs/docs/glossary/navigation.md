---
title: Navigation
sidebar:
  hidden: true
---

# Navigation

Site navigation configuration and the navigation plugin that renders header/footer links from the resolved manifest.

## Navigation configuration

The navigation is built from the resolved manifest using the `navigation` plugin. Entries are derived from `discoverable` content and can be customized via the `navigation` config section.

```ts
import { buildNavigation } from "@riebeckite/plugins/navigation";

const nav = buildNavigation(manifest.discoverableEntries, {
  items: [
    { label: "Home", href: "/" },
    { label: "Tags", href: "/tags" },
  ],
});
```

## Related terms

- [[glossary/site|Site]]
- [[site-config|Site Config]]
- [[route|Route]]

## Learn more

- [../plugins/navigation.md]