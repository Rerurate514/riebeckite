---
date: 2026-10-06
title: Publication, cache, and SPA
sidebar:
  label: Publication, cache, and SPA
  order: 30
---
# Publication, cache, and SPA

## publication

`publication` adds optional approval to the single publication model. Planning, artifact verification, and durable-state checks always run; approval defaults to off.

| Field | Type | Default | Effect |
| --- | --- | --- | --- |
| `requireApproval` | `boolean` | `false` | Require current approval records for every Riebeckite deploy path. |
| `approvalFile` | `string` | `"publication/approvals.json"` | Project-relative path to the committed approval records. |
| `schedule.enabled` | `boolean` | `false` | Run the deploy workflow on a schedule for `publishAt`. |
| `schedule.intervalMinutes` | `number` | `15` | Maximum minutes between scheduled runs. Integer from 5 to 59. |

```ts
publication: {
  requireApproval: true,
  approvalFile: "publication/approvals.json",
  schedule: {
    enabled: true,
    intervalMinutes: 30,
  },
}
```

`schedule` is written into the generated GitHub Actions workflow by `riebeckite deploy workflow`. The reference workflow is unscheduled by default. GitHub Actions does not run sub-hourly schedules more often than every 5 minutes.

The durable snapshot is written to `publication/state.json` for local runs and stored on the `publication-state` branch by CI. Keep `publication/state.json` out of Git. See [Publication workflow](../../guides/deployment/publication-workflow.md).

## cache

`cache` controls the persistent build cache.

| Field | Type | Default | Effect |
| --- | --- | --- | --- |
| `enabled` | `boolean` | `true` | Set `false` to disable the cache and rebuild everything. |
| `directory` | `string` | `<buildDirectory>/cache` | Overrides where cache entries are stored. |

```ts
cache: {
  enabled: true,
}
```

Disabling the cache or moving its directory affects build time only, not the
output. See [Build cache](../configuration/cache.md#build-cache).

## spa

`spa` enables client-side navigation. `true` uses the defaults; an object
configures the behavior. Omit it or set `false` to keep normal browser
navigation.

| Field | Type | Default | Effect |
| --- | --- | --- | --- |
| `prefetch` | `false` \| `"hover"` \| `"intent"` | `false` | `"hover"` fetches when the pointer enters a link; `"intent"` also fetches on focus and press. |
| `scrollRestoration` | `boolean` | `true` | Saves and restores scroll positions for history entries. |
| `viewTransitions` | `boolean` | `false` | Uses the browser View Transitions API when available and motion is allowed. |

```ts
spa: {
  prefetch: "intent",
  viewTransitions: true,
}
```

Config validation only checks that `spa` is a boolean or an object; invalid
option values throw when the runtime starts. See
[SPA navigation](../../guides/spa-navigation.md) for link handling and renderer
requirements.
