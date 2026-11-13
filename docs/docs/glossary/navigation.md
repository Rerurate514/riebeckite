---
date: 2026-10-14
title: Navigation
sidebar.hidden: true
---

# Navigation

Site navigation configuration and the navigation plugin that renders header/footer links from the resolved manifest.

## Navigation configuration

The navigation is built from the resolved manifest using the `navigation` plugin. Items are derived from `discoverable` content unless you pass `items`, and are customized through the plugin options rather than a top-level config section.

```ts
import { navigation } from "@riebeckite/plugin-navigation";

plugins: [
  navigation({
    items: [
      { label: "Home", href: "/" },
      { label: "Tags", href: "/tags" },
    ],
  }),
],
```

## Navigation plugin
The `navigation` plugin (`packages/plugins/navigation/src/navigation.ts`) renders header/footer links from the resolved manifest's discoverable entries. It builds the navigation structure by:

- Reading `manifest.discoverableEntries` to get all discoverable content
- Accepting `items` and `secondary` plugin options for labels, hrefs, and ordering
- Supporting nested menu structures and active route highlighting

The plugin contributes the built navigation to the site's layout through the integration's page rendering. Sites can fully customize the navigation UI by providing their own route rendering or their own items.

```ts
// Example: custom navigation options
navigation({
  items: [
    { label: "Home", href: "/" },
    { label: "Blog", href: "/blog" },
  ],
})
```

## Related terms

- [[glossary/site|Site]]
- [[site-config|Site Config]]
- [[route|Route]]

## Learn more

- [../plugins/navigation.md]