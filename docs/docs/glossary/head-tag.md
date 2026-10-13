---
title: Head tag
sidebar:
  hidden: true
---

# Head tag

Head tags and metadata for a page are contributed through the plugin system; the integration and site application compose the final `<head>` including title, description, and language attributes.

## Head composition

Plugins can contribute head-related data through page types and seo extensions. The final `<head>` is assembled by the integration (`@riebeckite/honox`) and the site application, merging core defaults, plugin contributions, and custom metadata.

## SEO integration

The `seo` extension point lets plugins participate in metadata and feed behavior. Head tags are not a direct plugin asset; they flow through the integration boundary.

## Related terms

- [[plugin|Plugin]]
- [[asset|Asset]]
- [[slot|Body slot]]

## Learn more

- [Plugin API](../reference/plugin-api.md)
- [HonoX UI](../framework/honox-integration/ui.md)
