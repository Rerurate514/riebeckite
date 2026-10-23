---
date: 2026-10-14
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

## Navigation plugin
The `navigation` plugin (`packages/plugins/navigation/src/index.ts`) renders header/footer links from the resolved manifest's discoverable entries. It builds the navigation structure by:

- Reading `manifest.discoverableEntries` to get all discoverable content
- Allowing customization via the `navigation` config section, which can specify item labels, hrefs, and ordering
- Supporting nested menu structures and active route highlighting

The plugin contributes the built navigation to the site's layout through the integration's page rendering. Sites can fully customize the navigation UI by providing their own route rendering or by modifying the `navigation` config section.

```ts
// Example: custom navigation config
navigation: {
  items: [
    { label: "Home", href: "/" },
    { label: "Blog", href: "/blog" },
  ],
},
```

## Related terms

## Related terms

- [[glossary/site|Site]]
- [[site-config|Site Config]]
- [[route|Route]]

## Learn more

- [../plugins/navigation.md]