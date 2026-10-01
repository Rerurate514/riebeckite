# Build System

## What a build owns

An explicit build resolves configuration and plugins, reads content, runs content and plugin pipelines, creates the manifest and content graph, emits registered assets and client entries, and records successful incremental state. The HonoX integration then builds the application with the generated entries.

Build state is application-scoped at `.riebeckite/build/content-state.json`. It is an optimization, not a source of truth. A missing, incompatible, or unsafe state causes an initial/full path; `--full` requests that path explicitly. State is saved only after a successful build, so a failure retains the prior valid state.

## Incremental inputs

`ContentSource` metadata may contain mtime, size, ETag, or a hash. Treat mtime as a hint only: timestamp-only comparisons are not sufficient for correctness when metadata can be unreliable. Plugin cache is separate from build state, plugin-scoped, JSON-serializable, regenerable build-time data. Neither may be required at Workers request time.

State tracks each entry's fingerprint together with its dependencies: the notes it links to (whose resolved permalink it may embed) and the assets it references (whose metadata, such as attachment size, it may render). A changed dependency invalidates the dependent entry and, transitively, its dependents. Added or removed entries invalidate link resolution globally, so they fall back to regenerating every note. The `.riebeckite` state directory is build-time state, not content, and is never scanned.

## Commands and lifecycle

```sh
pnpm build                 # configured project build
pnpm exec riebeckite build # content/application build
pnpm exec riebeckite build --full
pnpm exec riebeckite profile --full
```

Use `check` for validation and `doctor` for health diagnostics; neither substitutes for a build. Use `inspect` to view existing state, never to manufacture it. See [CLI](../reference/cli.md), [Inspector](inspector.md), and [Content system](content-system.md).

## Safe changes

When adding generated output, make its owner and cleanup behavior explicit. Do not silently write during validation or inspection. Cache keys must include every relevant version/input; raise a full-build fallback rather than reusing uncertain output. Keep failures observable and avoid deleting a previous successful state before replacement is known to be valid.
