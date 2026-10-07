# Build Dependency Contract

Core owns incremental invalidation. A plugin does not compute which content is affected, and it does not keep its own dependency state. It declares a contract and lets Core decide what to reuse.

A plugin takes part in two independent contracts:

- **Content dependency** (`processedContentCache`) decides which source content Core processes again.
- **Output dependency** (`outputDependencies` and `context.output.emit`) decides which emitted files Core writes again.

```mermaid
flowchart LR
    Change["Content or file change"] --> Content["Content dependency"]
    Content --> Reprocess["Reprocess affected content"]
    Reprocess --> Output["Output dependency"]
    Output --> Rewrite["Rewrite affected outputs"]
```

## Content dependency

`processedContentCache` states how Core may reuse a plugin's processed content between builds.

| `dependencyMode` | Meaning |
| --- | --- |
| `none` | Processing depends only on the source content, its frontmatter, the plugin options, and the declared version. |
| `tracked` | Processing reads other content or files through Core. Core records those reads and reprocesses only the consumers. |
| `unsafe` | Processing depends on inputs Core cannot observe, such as Git, network, time, or process state. Persistent reuse is disabled. |

A content-affecting plugin that declares no contract is treated as `unsafe`.

`version` names the contract. Core also includes the resolved plugin configuration in the cache key, so a change to the options, hooks, or version invalidates the cached entries.

### What Core records

Reads made through Core's content APIs become dependencies with stable identities.

| Kind | Recorded when | Identity |
| --- | --- | --- |
| `content` | `readContent`, `renderContent`, `renderNoteEmbed` | content slug |
| `file` | `contentSource.read` and helpers such as `readContentSourceEntry` | file path |
| `link` | A link target is resolved to a permalink | link id |

`contentSource.scan()` lists entries but creates no dependency. Direct filesystem, network, or clock access is invisible to Core, so those inputs belong to `unsafe`.

### Reuse and validation

On a later build, Core looks up the cached processed content, then re-reads every recorded content, file, and link dependency and compares fingerprints. If any fingerprint changed, Core discards the entry and processes it again.

The cache skips only Markdown and HTML processing. The post-processing hooks (`onPostParsed`, `onPostProcessed`) and the manifest hook (`onManifestCreated`) always run, so manifest-stage work belongs there.

### Affected content

Core persists each entry's dependency identities in build state and builds a reverse index from them. When a dependency changes, Core marks the dependent entry and propagates the invalidation to its dependents transitively. When content is added or removed, entries that link to a changed target are invalidated as well. On the first build, or whenever no previous state is available, every note is processed.

## Output dependency

Output dependencies are separate from content dependencies. Each type reacts to a different part of the change set.

| Type | Affected when |
| --- | --- |
| `content { slug }` | That content changed. |
| `tag { tag }` | Content carrying that tag changed. |
| `folder { folder }` | Content in that folder changed. |
| `global` | Any content changed. |
| `unknown` | Always. Core also requests full output regeneration. |

Declare them in the following places.

- `pageTypes[].outputDependencies` for a plugin page.
- Root `outputDependencies` for a plugin that updates existing manifest entry HTML in `onManifestCreated`. Core adds them to every content output.
- `context.output.emit(..., { dependencies })` for a generated output. Without declared dependencies, a generated output is `unknown`.

Use `content`, `tag`, or `folder` when the scope is known, and `global` for a manifest-wide collection transform. Use `unknown` only when the input cannot be represented.

`none`, `tracked`, and `unsafe` describe processed-content reuse, not output reuse. A plugin can safely use `none` while declaring a `global` output dependency, or use `tracked` while a generated output has a narrow `content` dependency. An incorrect output declaration can preserve a stale file, so use `unknown` whenever the output scope cannot be stated completely. `unknown` deliberately trades incremental SSG for a full output render.

## Rules for plugin authors

- Declare `processedContentCache` on every content-affecting plugin.
- Read other content and files only through Core APIs so the reads are recorded.
- Do not keep a content map, rescan the vault, or maintain plugin-specific incremental state.
- Use `unsafe` when an input cannot be observed. A broad rebuild is acceptable; a stale result is not.
- Declare output dependencies for manifest-stage mutations and generated outputs.

See [Plugin API](../reference/plugin-api.md) for the exact fields and [Build System](./build-system.md) for the build lifecycle.
