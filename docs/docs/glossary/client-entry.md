---
date: 2026-10-14
title: Client entry
sidebar:
  hidden: true
---

# Client entry

Client entries declare browser JavaScript initialization that is genuinely required at runtime; each entry has a plugin name, module specifier, optional export name, and public config passed to the initializer.

## Declaration

```ts
clientEntries: [
  {
    pluginName: "example",
    moduleSpecifier: "@riebeckite/plugin-example/client",
    exportName: "initExample",
    publicConfig: { selector: ".example" },
  },
]
```

## When to use

Only add client entries when browser initialization is required. Do not add client JavaScript to plugins that complete entirely at SSR or build time. `publicConfig` is passed to the client initializer and recorded in the manifest for static hosts.

## Related terms

- [[plugin|Plugin]]
- [[island|Island]]
- [[endpoint|Endpoint]]

## Learn more

- [Plugin API](../reference/plugin-api.md)
- [HonoX Integration](../framework/honox-integration.md)
