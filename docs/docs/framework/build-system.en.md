# Build System

## What a build owns

An explicit build resolves configuration and plugins, reads content, runs content and plugin pipelines, creates the manifest and content graph, emits registered assets and client entries, and records successful incremental state. The HonoX integration then builds the application with the generated entries.

Build state is application-scoped at `.riebeckite/build/content-state.json`. It is an optimization, not a source of truth. A missing, incompatible, or unsafe state causes an initial/full path; `--full` requests that path explicitly. State is saved only after a successful build, so a failure retains the prior valid state.

## Incremental inputs

`ContentSource` metadata may contain mtime, size, ETag, or a hash. Treat mtime as a hint only: timestamp-only comparisons are not sufficient for correctness when metadata can be unreliable. Plugin cache is separate from build state, plugin-scoped, JSON-serializable, regenerable build-time data. Neither may be required at Workers request time.

State tracks each entry's fingerprint together with its dependencies: the notes it links to (whose resolved permalink it may embed) and the assets it references (whose metadata, such as attachment size, it may render). A changed dependency invalidates the dependent entry and, transitively, its dependents. Added or removed entries change which link targets resolve, so entries that reference an affected target are invalidated as well. On the first build, or when no previous state is available, every note is processed. The `.riebeckite` state directory is build-time state, not content, and is never scanned.

## Persistent per-content cache

The processed Markdown result for each note is stored in `.riebeckite/cache/content/v3`. A build without an entry is a **cold build**. Restoring compatible entries before a later build makes it a **warm build**: unchanged notes can reuse their processed HTML and frontmatter while the normal build still generates `dist/`.

An entry key includes its Markdown source, parsed frontmatter, the cache schema, and the processing-pipeline fingerprint. The fingerprint includes content-filter configuration, plugin configuration and order, plugin `cacheVersion` and processed-content cache contracts, and the Core compatibility version. Cached content also records logical content, file, and link dependencies; changed or missing dependencies are misses. Unsafe plugins bypass this cache. Cache data contains logical slugs and normalized source paths rather than workspace paths, so it can be copied to a different runner or workspace on the same operating system.

This cache is an optimization, never a correctness dependency. Missing entries, incompatible versions, malformed metadata, fingerprint or dependency mismatches, and corrupted JSON are safe misses. Delete `.riebeckite/cache` to force cold processing; a filesystem access failure still fails the build because it requires attention. The build log reports one `Persistent content cache` line with `hits`, `misses`, and `bypasses`, plus a concise `Content` line (total, processed, and reused counts) and the total `Build complete` duration.

For GitHub Actions, cache `.riebeckite/cache` and `.riebeckite/build/content-state.json`, not `dist/`. The output cache (`.riebeckite/ssg-output-cache.json`) stays local because its build-time saving does not offset the transfer cost. The generated Cloudflare workflow does this automatically; see [GitHub Actions](../guides/deployment/github-actions.en.md).

## Output-level incremental SSG

Persistent per-content cache reuses Markdown and plugin processing. Output-level incremental SSG separately reuses final routes and generated files. After building the current manifest, Core compares its output descriptors with the previous successful state. HonoX renders only affected content and plugin-page routes, restores unchanged generated output from `.riebeckite/ssg-output-cache.json`, and removes outputs no longer owned by the site. The build log reports an `SSG outputs` line with the `rendered`, `reused`, and `removed` counts.

The state and output cache are optimizations. A missing, incompatible, malformed, or incomplete output state, an application/configuration fingerprint change, or an `unknown` output dependency makes HonoX render every output. Delete `.riebeckite/build/content-state.json` and `.riebeckite/ssg-output-cache.json` to force that safe path. `dist/` is not a cache: Vite may recreate it, and unchanged site outputs are re-emitted from the output cache. This is a build optimization only; it does not change Wrangler's Cloudflare Workers deployment protocol.

## Commands and lifecycle

```sh
pnpm build                 # configured project build
pnpm exec riebeckite build # content/application build
pnpm exec riebeckite build --full
pnpm exec riebeckite profile --full
```

Use `check` for validation and `doctor` for health diagnostics; neither substitutes for a build. Use `inspect` to view existing state, never to manufacture it. See [CLI](../reference/cli.en.md), [Inspector](inspector.en.md), and [Content system](content-system.en.md).

## Safe changes

When adding generated output, make its owner and cleanup behavior explicit. Do not silently write during validation or inspection. Cache keys must include every relevant version/input; raise a full-build fallback rather than reusing uncertain output. Keep failures observable and avoid deleting a previous successful state before replacement is known to be valid.
