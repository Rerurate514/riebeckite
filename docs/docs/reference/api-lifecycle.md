---
date: 2026-11-02
title: API lifecycle
---
# API lifecycle

API lifecycle metadata records whether a public API is stable, deprecated, or removed. It gives the IDE, CLI, Diagnostics, and the Development Inspector one source for deprecation reasons, replacements, migration guides, and confirmed removal versions.

Lifecycle metadata does not change API behavior. It does not add a compatibility layer, remove an API, or fail a build on its own.

## States and fields

A lifecycle definition uses one of three states:

| Status | Meaning |
| --- | --- |
| `stable` | The public API is supported. |
| `deprecated` | The public API should be replaced, but still works. |
| `removed` | The public API is no longer available. |

A deprecated definition has these fields:

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | yes | Stable identifier in `<package>#<api>` form, such as `@riebeckite/core#oldApi` |
| `kind` | yes | `function`, `class`, `type`, `interface`, `constant`, `config-key`, `plugin-option`, `plugin-hook`, `cli-command`, `cli-flag`, or `integration` |
| `status` | yes | `stable`, `deprecated`, or `removed` |
| `package` | no | Package that owns the API; derived from `id` when omitted |
| `deprecatedSince` | yes | Version in which the API became deprecated |
| `reason` | yes | Why the API is deprecated |
| `replacement` | no | API ID to use instead |
| `removalVersion` | no | Confirmed version in which the API will be removed |
| `migrationGuide` | no | Documentation path or short instruction for migration |
| `summary` | no | One-line description used by tooling |
| `diagnosticCode` | no | Diagnostic code for this API; defaults to `RB-API-001` |
| `configPath` | no | Dot path of a deprecated configuration key, used for usage detection |
| `pluginOption` | no | `{ plugin, option }` of a deprecated plugin option, used for usage detection |

A `removed` definition requires `removalVersion` and `reason`. A `stable` definition must not set `deprecatedSince` or `removalVersion`.

Only set `removalVersion` when the removal is actually confirmed. If no removal is scheduled, omit it. Tooling reports the removal as unconfirmed instead of inventing a version.

## Declaring lifecycle metadata

Use `defineApiLifecycle` to validate a single definition:

```ts
import { defineApiLifecycle } from "@riebeckite/core";

export const legacyMode = defineApiLifecycle({
  id: "@riebeckite/plugin-example#legacyMode",
  kind: "plugin-option",
  status: "deprecated",
  package: "@riebeckite/plugin-example",
  deprecatedSince: "0.2.0",
  removalVersion: "0.4.0",
  replacement: "@riebeckite/plugin-example#mode",
  reason: "The legacy mode is no longer supported.",
  migrationGuide: "/reference/plugin-api/",
  pluginOption: { plugin: "example", option: "legacyMode" },
});
```

`defineApiLifecycle` throws `ApiLifecycleValidationError` when the metadata is invalid. The error contains structured `issues`, so a test or a build-time script can report every problem at once.

A Plugin exposes its lifecycle definitions through the `apiLifecycle` field:

```ts
import { definePlugin } from "@riebeckite/core";

export function example() {
  return definePlugin({
    name: "example",
    apiLifecycle: [legacyMode],
  });
}
```

`resolveApiLifecycle(config)` builds the registry from the built-in lifecycle APIs and every enabled plugin's `apiLifecycle` field. Pass additional definitions as the second argument when a caller owns definitions outside a plugin.

`createApiLifecycleRegistry(definitions)` accepts definitions directly. Invalid entries are skipped and reported as validation issues instead of throwing, so a broken plugin cannot stop config resolution. Duplicate IDs keep the first definition and report `duplicate-id`.

The registry exposes `entries`, `issues`, `get(id)`, and `deprecated()`. Entries and the registry are frozen.

## JSDoc

Mark a deprecated TypeScript API with `@deprecated` in its public declaration:

```ts
/**
 * @deprecated Since 0.2.0. Use `newApi` instead.
 */
export function oldApi(): void {}
```

The tag keeps the deprecation visible in editors and in emitted declarations. Keep the implementation, exported type, and lifecycle metadata consistent: the same API should not be marked deprecated in one place and stable in another.

## Diagnostics

Riebeckite reports lifecycle findings through the existing Diagnostics system:

| Code | Severity | Condition |
| --- | --- | --- |
| `RB-API-001` | `warning` | A deprecated API is used in the configuration |
| `RB-API-002` | `error` | Lifecycle metadata is invalid |

`RB-API-001` includes the API ID, package, deprecated-since version, replacement, removal version (or `not confirmed`), migration guide, reason, and where the usage was detected. Usage detection is limited to explicit `pluginOption` and `configPath` metadata; it does not scan source code for arbitrary references.

A deprecated API never fails `check` or `doctor` by default. `doctor --fail-on warning` makes deprecation warnings fail a CI check when a project wants that strictness. Invalid metadata is an error because the registry cannot describe the API reliably.

## CLI

`check` reports deprecated API usage with its replacement and migration details. It does not fail because of a deprecation warning.

`doctor` includes the same findings in its shared report and JSON output. Use `--code RB-API-001` to select them.

`inspect api` lists every lifecycle-managed API. `--deprecated` limits the list to deprecated APIs, and `--json` prints the inspection as JSON:

```sh
riebeckite inspect api --deprecated
```

## Development Inspector

The Development Inspector's API tab shows the resolved registry. Each entry lists its status, kind, package, deprecated-since version, replacement, removal version, migration guide, and reason. Deprecated entries also show whether the current configuration uses them. The tab is read-only and is available only in the development server.

## Removal policy

Lifecycle metadata describes a change; it does not schedule one. Removing an API remains a separate decision.

Before 1.0, a minor release may contain a breaking change. A deprecation period is optional, and Riebeckite does not add compatibility layers solely to keep a deprecated API alive. When a replacement exists, publish it in the lifecycle metadata and migration guide. Do not promise a removal version that has not been decided.

The lifecycle registry, the change entry for a release, and `CHANGELOG.md` are separate records. A future release workflow can link them, but lifecycle metadata is not a substitute for release notes.

## Related

- [Diagnostics](../framework/diagnostics.md)
- [Core API](./core-api.md)
- [Plugin API](./plugin-api.md)
- [Upgrading](../guides/upgrading.md)
