---
date: 2026-10-14
title: Endpoint
sidebar:
  hidden: true
---

# Endpoint

Endpoints declare reusable HTTP behavior for plugins; the integration connects the endpoint contract to the host router without embedding framework-specific routing in the plugin itself.

## Define an endpoint

```ts
import { defineEndpoint } from "@riebeckite/core";

const searchEndpoint = defineEndpoint(
  "/search-data.json",
  ({ config, manifest }) => ({ json: buildSearchItems({ config, manifest }) }),
  { cacheControl: "public, max-age=300" },
);
```

## Integration connection

The integration connects the endpoint contract to the host router. Do not embed a specific router implementation (such as HonoX) in the plugin itself.

## Related terms

- [[plugin|Plugin]]
- [[island|Island]]
- [[client-entry|Client entry]]

## Learn more

- [Plugin API](../reference/plugin-api.md)
