# Local Plugin guide

Use a local Plugin when the behaviour is reusable, content-processing related, or needs a stable extension contract. Use application code for one-off page behaviour.

## Minimal Plugin

```ts
import { definePlugin } from "@riebeckite/core";

export function example() {
  return definePlugin({ name: "example" });
}
```

With typed options:

```ts
type ExampleOptions = { enabled?: boolean; className?: string };

export function example(options: ExampleOptions = {}) {
  return definePlugin({
    name: "example",
    options,
    validateOptions(value) {
      if (value.className !== undefined && !/^[a-z][a-z0-9-]*$/.test(value.className)) {
        throw new Error("className must be a lowercase CSS identifier");
      }
    },
  });
}
```

Keep the package name, exported factory, and Plugin `name` stable once other projects depend on them.

## Choose the extension point

| Need | Use |
| --- | --- |
| Add a Remark or Rehype transform | `remarkPlugins` or `rehypePlugins` |
| Configure a transform with pipeline context | `extendMarkdownPipeline` or `extendHtmlPipeline` |
| Validate configuration | `validateOptions` |
| Prepare or clean up process state | `setup`, `buildStart`, `buildEnd`, `dispose` |
| Add a content-derived output | `outputDependencies` plus `context.output.emit` |
| Provide a page type or renderer | `pageTypes`, `renderers` |
| Add a site endpoint | `endpoints` |
| Add a client entry or asset | `clientEntries`, `assets` |
| Add a development route or cache rule | `developmentRouteManifest`, `developmentRouteCache` |
| Add a diagnostic | `addDiagnostics` |

Prefer direct transforms for simple, context-free work. Use pipeline extensions when the transform needs `context.contentSource` or other pipeline services.

## Processed-content cache

Set `processedContentCache.version` whenever the transform output changes. Bump it when the algorithm or its interpretation changes.

| `dependencyMode` | Use when the transform reads | Behaviour and rule |
| --- | --- | --- |
| `none` | Only the current source, frontmatter, options, and version | Default. No extra dependency tracking. |
| `tracked` | Other content or files through `context.contentSource`, `readContentSourceEntry`, `renderContent`, or `renderNoteEmbed` | Core records the dependencies. Do not read the filesystem directly. |
| `global` | Resolved locations across the vault, such as a link target set | Core fingerprints the location set and reprocesses all entries when any location changes. |
| `unsafe` | Git, network, time, process state, or another untrackable input | Bypasses persistent processed-content reuse. Use only when the input truly cannot be tracked. |

Do not implement Plugin-local incremental invalidation. The framework owns cache reuse; an incorrect declaration produces stale output.

Tracked example:

```ts
definePlugin({
  name: "citations",
  processedContentCache: { version: "citations-v1", dependencyMode: "tracked" },
  extendMarkdownPipeline(pipeline, context) {
    pipeline.use(remarkCitations, { contentSource: context.contentSource });
  },
});
```

Output dependencies are separate from processed-content cache. When a transform emits a tag page, folder index, or global artifact, declare the matching output dependency so the emitter is rerun.

## Styles and assets

- `rb-*` classes and `--rb-*` tokens belong to the framework. Do not redefine them.
- Extension-owned hooks use `rr-*` and `--rr-*`.
- Register CSS through `assets`:

```ts
assets: [
  {
    pluginName: "example",
    kind: "style",
    moduleSpecifier: "@riebeckite/plugin-example/style.css",
  },
],
```

An in-site asset can use a module specifier such as `/extensions/plugin.css`. Keep selectors scoped to the extension's hooks.

## Tests

Cover:

- The transform output for a representative fixture.
- Options and invalid input.
- The declared `dependencyMode` and any output dependency.
- A missing or ambiguous content source, when relevant.
- The public factory's exported type surface.

Do not test private framework internals.

## Commands

```sh
npm exec riebeckite create plugin reading-time --features transform
npm exec riebeckite plugin verify <path> --level full
npm exec riebeckite plugin dev <path>
npm exec riebeckite plugin dev <path> --port 4321 --no-open
```

`plugin verify` checks the package contract. It does not replace a site-level `npm run check` or `npm run build`.

## Common failures

| Symptom | Likely cause |
| --- | --- |
| Output is stale after a content edit | Wrong `dependencyMode`, missing dependency tracking, or an unchanged cache `version`. |
| Build is slower after enabling | `unsafe` used for trackable input, or a `global` declaration when `tracked` would suffice. |
| Plugin works alone but not in the site | Missing registration, wrong option shape, or a companion requirement. |
| Styles leak into framework UI | Unscoped selectors or an attempt to override `rb-*`. |
| Verification passes but the site fails | Contract is valid, but the Plugin is incompatible with the project's content formats or configuration. |

## Report

State the extension points used, cache mode, output dependencies, tests, commands run, and any remaining contract or compatibility risk.
